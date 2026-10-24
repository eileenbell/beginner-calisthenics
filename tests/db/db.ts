import { randomUUID } from "node:crypto";
import pg from "pg";
import { databaseUrl } from "../../scripts/local-supabase/setup-db";

// Helpers for database tests. Statements run inside a transaction with the
// same role and JWT claims PostgREST would set for a signed-in user, so row
// level security applies exactly as it does through the Supabase API.

export const pool = new pg.Pool({ connectionString: databaseUrl("form_test"), max: 4 });

export async function createUser(name = "Test user"): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
     values ($1, $2, crypt('password-123', gen_salt('bf')), now(), jsonb_build_object('display_name', $3::text))`,
    [id, `${id}@example.test`, name],
  );
  return id;
}

type Role = "authenticated" | "anon";

export async function as<T>(userId: string | null, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const role: Role = userId ? "authenticated" : "anon";
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role } : { role }),
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Runs `fn` as the user and returns the Postgres error code it fails with, or null. */
export async function errorCode(userId: string | null, fn: (client: pg.PoolClient) => Promise<unknown>): Promise<string | null> {
  try {
    await as(userId, fn);
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
}

export const PREFERENCES = {
  goals: ["first_push_up"],
  experience: "complete_beginner",
  days_per_week: 3,
  training_days: [1, 3, 5],
  session_minutes: 25,
  equipment: ["none"],
  environment: "home",
  time_zone: "Australia/Sydney",
};

export const SCHEDULE = [
  { week: 1, slot: 0, template: "A", scheduled_on: "2026-10-26" },
  { week: 1, slot: 1, template: "B", scheduled_on: "2026-10-28" },
  { week: 1, slot: 2, template: "A", scheduled_on: "2026-10-30" },
];

export const STATES = [
  { family_id: "push_up", exercise_id: "wall_push_up", target: 8 },
  { family_id: "squat", exercise_id: "box_squat", target: 8 },
];

export async function createProgramme(userId: string, complete = true): Promise<string> {
  return as(userId, async (c) => {
    const { rows } = await c.query(
      "select public.create_programme($1, $2, $3::smallint, $4, $5, $6) as id",
      [PREFERENCES, "2026-10-26", 12, JSON.stringify(SCHEDULE), JSON.stringify(STATES), complete],
    );
    return rows[0].id as string;
  });
}

export async function startSession(userId: string): Promise<string> {
  return as(userId, async (c) => {
    const { rows: slots } = await c.query(
      "select id, template from public.scheduled_workouts where user_id = $1 order by scheduled_on limit 1",
      [userId],
    );
    const { rows } = await c.query(
      `insert into public.workout_sessions (user_id, scheduled_workout_id, template, title, plan)
       values ($1, $2, $3, 'Upper Body Foundations', '{"items": []}') returning id`,
      [userId, slots[0].id, slots[0].template],
    );
    return rows[0].id as string;
  });
}
