import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createProgramme, createUser, errorCode, pool, startSession } from "./db";

// Data isolation: every user table is readable and writable only by its owner,
// anonymous visitors see reference data only, and the functions refuse to act
// on someone else's rows.

const USER_TABLES = [
  "onboarding_responses",
  "training_preferences",
  "programmes",
  "scheduled_workouts",
  "workout_sessions",
  "set_logs",
  "exercise_feedback",
  "user_exercise_progress",
  "progression_events",
  "user_milestones",
  "user_achievements",
  "saved_exercises",
];

let alice: string;
let bob: string;
let aliceSession: string;

beforeAll(async () => {
  alice = await createUser("Alice");
  bob = await createUser("Bob");
  await createProgramme(alice);
  await createProgramme(bob);
  aliceSession = await startSession(alice);
  await as(alice, async (c) => {
    await c.query(
      "insert into public.set_logs (session_id, user_id, item_index, exercise_id, set_number, reps) values ($1, $2, 0, 'wall_push_up', 1, 10)",
      [aliceSession, alice],
    );
    await c.query("insert into public.saved_exercises (user_id, exercise_id) values ($1, 'wall_push_up')", [alice]);
  });
});

afterAll(async () => {
  await pool.end();
});

describe("new accounts", () => {
  it("get a profile and an onboarding record", async () => {
    const id = await createUser("  Sam  ");
    const profile = await pool.query("select display_name from public.profiles where id = $1", [id]);
    expect(profile.rows[0].display_name).toBe("Sam");
    const onboarding = await pool.query("select current_step, completed_at from public.onboarding_responses where user_id = $1", [id]);
    expect(onboarding.rows[0]).toEqual({ current_step: "goals", completed_at: null });
  });
});

describe("row level security", () => {
  it.each(USER_TABLES)("%s: a user sees none of another user's rows", async (table) => {
    const rows = await as(bob, (c) => c.query(`select user_id from public.${table}`));
    expect(rows.rows.every((r) => r.user_id === bob)).toBe(true);
    const all = await pool.query(`select count(*)::int as n from public.${table} where user_id = $1`, [alice]);
    if (["onboarding_responses", "training_preferences", "programmes", "scheduled_workouts", "workout_sessions", "set_logs", "user_exercise_progress", "saved_exercises"].includes(table)) {
      // Make sure the test is meaningful: Alice really has rows here.
      expect(all.rows[0].n).toBeGreaterThan(0);
    }
  });

  it("hides other profiles", async () => {
    const rows = await as(bob, (c) => c.query("select id from public.profiles"));
    expect(rows.rows.map((r) => r.id)).toEqual([bob]);
  });

  it("lets anonymous visitors read reference data only", async () => {
    const exercises = await as(null, (c) => c.query("select count(*)::int as n from public.exercises"));
    expect(exercises.rows[0].n).toBeGreaterThan(50);
    for (const table of [...USER_TABLES, "profiles"]) {
      expect(await errorCode(null, (c) => c.query(`select * from public.${table}`))).toBe("42501");
    }
  });

  it("refuses inserts on behalf of another user", async () => {
    const code = await errorCode(bob, (c) =>
      c.query("insert into public.saved_exercises (user_id, exercise_id) values ($1, 'box_squat')", [alice]),
    );
    expect(code).toBe("42501");
  });

  it("refuses set logs against another user's workout", async () => {
    const code = await errorCode(bob, (c) =>
      c.query(
        "insert into public.set_logs (session_id, user_id, item_index, exercise_id, set_number, reps) values ($1, $2, 1, 'wall_push_up', 1, 10)",
        [aliceSession, bob],
      ),
    );
    // The composite foreign key (session_id, user_id) has no match for Bob.
    expect(code).toBe("23503");
  });

  it("silently skips updates and deletes of another user's rows", async () => {
    await as(bob, async (c) => {
      const updated = await c.query("update public.set_logs set reps = 99 where session_id = $1", [aliceSession]);
      expect(updated.rowCount).toBe(0);
      const deleted = await c.query("delete from public.saved_exercises where user_id = $1", [alice]);
      expect(deleted.rowCount).toBe(0);
    });
    const check = await pool.query("select reps from public.set_logs where session_id = $1", [aliceSession]);
    expect(check.rows[0].reps).toBe(10);
  });

  it("does not let a user move a row to another account", async () => {
    const code = await errorCode(alice, (c) =>
      c.query("update public.saved_exercises set user_id = $1 where user_id = $2", [bob, alice]),
    );
    expect(code).toBe("42501");
  });

  it("only lets users change their display name", async () => {
    await as(alice, (c) => c.query("update public.profiles set display_name = 'Alice B' where id = $1", [alice]));
    expect(await errorCode(alice, (c) => c.query("update public.profiles set created_at = now() where id = $1", [alice]))).toBe("42501");
    expect(await errorCode(alice, (c) => c.query("update public.profiles set id = $1 where id = $2", [bob, alice]))).toBe("42501");
  });

  it("does not let users edit reference data", async () => {
    expect(await errorCode(alice, (c) => c.query("update public.exercises set name = 'x'"))).toBe("42501");
    expect(await errorCode(alice, (c) => c.query("delete from public.skills"))).toBe("42501");
  });

  it("does not let users insert into auth.users or call internal functions", async () => {
    expect(await errorCode(alice, (c) => c.query("select * from auth.users"))).toBe("42501");
    expect(await errorCode(alice, (c) => c.query("select public.handle_new_user()"))).toBe("42501");
  });
});

describe("functions refuse other users' data", () => {
  it("complete_workout will not finish someone else's workout", async () => {
    const code = await errorCode(bob, (c) =>
      c.query("select public.complete_workout($1, '[]', '[]', '[]', '{}', '{}')", [aliceSession]),
    );
    expect(code).toBe("P0002");
    const status = await pool.query("select status from public.workout_sessions where id = $1", [aliceSession]);
    expect(status.rows[0].status).toBe("in_progress");
  });

  it("export_my_data contains only the caller's rows", async () => {
    const result = await as(bob, (c) => c.query("select public.export_my_data() as data"));
    const data = result.rows[0].data;
    expect(data.profile.id).toBe(bob);
    expect(data.set_logs).toEqual([]);
    expect(data.saved_exercises).toEqual([]);
    expect(JSON.stringify(data)).not.toContain(alice);
  });

  it("anonymous callers cannot use any function", async () => {
    for (const sql of [
      "select public.export_my_data()",
      "select public.delete_my_account()",
      "select public.resume_family('push_up')",
    ]) {
      expect(await errorCode(null, (c) => c.query(sql))).toBe("42501");
    }
  });
});
