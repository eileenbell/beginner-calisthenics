import { afterAll, describe, expect, it } from "vitest";
import { as, createProgramme, createUser, errorCode, pool, PREFERENCES, SCHEDULE, startSession } from "./db";

afterAll(async () => {
  await pool.end();
});

describe("create_programme", () => {
  it("stores preferences, schedule and starting progressions and finishes onboarding", async () => {
    const user = await createUser();
    const programme = await createProgramme(user);
    const { rows: schedule } = await pool.query("select week, slot, template, status from public.scheduled_workouts where programme_id = $1 order by slot", [programme]);
    expect(schedule).toEqual([
      { week: 1, slot: 0, template: "A", status: "planned" },
      { week: 1, slot: 1, template: "B", status: "planned" },
      { week: 1, slot: 2, template: "A", status: "planned" },
    ]);
    const prefs = await pool.query("select training_days, session_minutes from public.training_preferences where user_id = $1", [user]);
    expect(prefs.rows[0]).toEqual({ training_days: [1, 3, 5], session_minutes: 25 });
    const progress = await pool.query("select family_id, exercise_id, target from public.user_exercise_progress where user_id = $1 order by family_id", [user]);
    expect(progress.rows).toEqual([
      { family_id: "push_up", exercise_id: "wall_push_up", target: 8 },
      { family_id: "squat", exercise_id: "box_squat", target: 8 },
    ]);
    const onboarding = await pool.query("select current_step, completed_at from public.onboarding_responses where user_id = $1", [user]);
    expect(onboarding.rows[0].current_step).toBe("summary");
    expect(onboarding.rows[0].completed_at).not.toBeNull();
  });

  it("archives the previous programme and keeps progression state", async () => {
    const user = await createUser();
    const first = await createProgramme(user);
    await pool.query("update public.user_exercise_progress set exercise_id = 'high_incline_push_up' where user_id = $1 and family_id = 'push_up'", [user]);
    const second = await createProgramme(user);
    const { rows } = await pool.query("select id, status from public.programmes where user_id = $1 order by created_at", [user]);
    expect(rows).toEqual([
      { id: first, status: "archived" },
      { id: second, status: "active" },
    ]);
    const push = await pool.query("select exercise_id from public.user_exercise_progress where user_id = $1 and family_id = 'push_up'", [user]);
    expect(push.rows[0].exercise_id).toBe("high_incline_push_up");
  });

  it("rejects training days that don't match the frequency", async () => {
    const user = await createUser();
    const code = await errorCode(user, (c) =>
      c.query("select public.create_programme($1, '2026-10-26', 12::smallint, '[]', '[]')", [
        { ...PREFERENCES, training_days: [1, 3] },
      ]),
    );
    expect(code).toBe("23514");
  });

  it("rejects unsupported session lengths and goals lists", async () => {
    const user = await createUser();
    for (const prefs of [{ ...PREFERENCES, session_minutes: 60 }, { ...PREFERENCES, goals: [] }]) {
      const code = await errorCode(user, (c) =>
        c.query("select public.create_programme($1, '2026-10-26', 12::smallint, '[]', '[]')", [prefs]),
      );
      expect(code).toBe("23514");
    }
  });
});

describe("workouts", () => {
  it("allows only one workout in progress at a time", async () => {
    const user = await createUser();
    await createProgramme(user);
    await startSession(user);
    const code = await errorCode(user, (c) =>
      c.query(
        "insert into public.workout_sessions (user_id, template, title, plan) values ($1, 'B', 'Lower', '{}')",
        [user],
      ),
    );
    expect(code).toBe("23505");
  });

  it("keeps one row per set, so re-logging a set updates it", async () => {
    const user = await createUser();
    await createProgramme(user);
    const session = await startSession(user);
    await as(user, async (c) => {
      const upsert = `insert into public.set_logs (session_id, user_id, item_index, exercise_id, set_number, reps)
        values ($1, $2, 0, 'wall_push_up', 1, $3)
        on conflict (session_id, item_index, set_number) do update set reps = excluded.reps`;
      await c.query(upsert, [session, user, 8]);
      await c.query(upsert, [session, user, 10]);
    });
    const { rows } = await pool.query("select reps from public.set_logs where session_id = $1", [session]);
    expect(rows).toEqual([{ reps: 10 }]);
  });

  it("rejects impossible set values", async () => {
    const user = await createUser();
    await createProgramme(user);
    const session = await startSession(user);
    for (const [reps, setNumber] of [[-1, 1], [301, 1], [5, 0], [5, 11]]) {
      const code = await errorCode(user, (c) =>
        c.query(
          "insert into public.set_logs (session_id, user_id, item_index, exercise_id, set_number, reps) values ($1, $2, 0, 'wall_push_up', $3, $4)",
          [session, user, setNumber, reps],
        ),
      );
      expect(code).toBe("23514");
    }
  });

  it("complete_workout stores feedback, progress, events, milestones and achievements atomically", async () => {
    const user = await createUser();
    await createProgramme(user);
    const session = await startSession(user);
    const feedback = [{ item_index: 0, exercise_id: "wall_push_up", family_id: "push_up", difficulty: "about_right", good_control: true, decision: { kind: "increase_target" } }];
    const progress = [{ family_id: "push_up", exercise_id: "wall_push_up", target: 10, success_streak: 1, difficult_streak: 0, pain_reports: [], paused: false }];
    const events = [{ family_id: "push_up", kind: "increase_target", from_exercise_id: "wall_push_up", to_exercise_id: "wall_push_up", from_target: 8, to_target: 10, reason: "You hit the top of the range." }];
    await as(user, (c) =>
      c.query("select public.complete_workout($1, $2, $3, $4, $5, $6)", [
        session,
        JSON.stringify(feedback),
        JSON.stringify(progress),
        JSON.stringify(events),
        ["core_plank_30"],
        ["first_workout"],
      ]),
    );

    const s = await pool.query("select status, completed_at from public.workout_sessions where id = $1", [session]);
    expect(s.rows[0].status).toBe("completed");
    const slot = await pool.query("select w.status from public.scheduled_workouts w join public.workout_sessions s on s.scheduled_workout_id = w.id where s.id = $1", [session]);
    expect(slot.rows[0].status).toBe("completed");
    const p = await pool.query("select target, success_streak from public.user_exercise_progress where user_id = $1 and family_id = 'push_up'", [user]);
    expect(p.rows[0]).toEqual({ target: 10, success_streak: 1 });
    const counts = await pool.query(
      `select (select count(*) from public.exercise_feedback where session_id = $1)::int as feedback,
              (select count(*) from public.progression_events where session_id = $1)::int as events,
              (select count(*) from public.user_milestones where session_id = $1)::int as milestones,
              (select count(*) from public.user_achievements where user_id = $2)::int as achievements`,
      [session, user],
    );
    expect(counts.rows[0]).toEqual({ feedback: 1, events: 1, milestones: 1, achievements: 1 });

    // Finishing twice is refused, so a double tap can't double count.
    const again = await errorCode(user, (c) => c.query("select public.complete_workout($1, '[]', '[]', '[]', '{}', '{}')", [session]));
    expect(again).toBe("22023");
  });

  it("complete_workout rolls everything back if any part fails", async () => {
    const user = await createUser();
    await createProgramme(user);
    const session = await startSession(user);
    const code = await errorCode(user, (c) =>
      c.query("select public.complete_workout($1, '[]', $2, '[]', $3, '{}')", [
        session,
        JSON.stringify([{ family_id: "push_up", exercise_id: "wall_push_up", target: 12, success_streak: 2, difficult_streak: 0 }]),
        ["not_a_real_milestone"],
      ]),
    );
    expect(code).toBe("23503");
    const s = await pool.query("select status from public.workout_sessions where id = $1", [session]);
    expect(s.rows[0].status).toBe("in_progress");
    const p = await pool.query("select target from public.user_exercise_progress where user_id = $1 and family_id = 'push_up'", [user]);
    expect(p.rows[0].target).toBe(8);
  });
});

describe("reschedule_programme", () => {
  it("replaces future planned sessions and keeps completed ones", async () => {
    const user = await createUser();
    const programme = await createProgramme(user);
    await pool.query("update public.scheduled_workouts set status = 'completed', completed_at = now() where programme_id = $1 and slot = 0", [programme]);
    await as(user, (c) =>
      c.query("select public.reschedule_programme($1, '2026-10-27', $2)", [
        { ...PREFERENCES, days_per_week: 2, training_days: [2, 5], session_minutes: 15 },
        JSON.stringify([{ week: 1, slot: 1, template: "B", scheduled_on: "2026-10-30" }]),
      ]),
    );
    const { rows } = await pool.query("select slot, scheduled_on::text, status from public.scheduled_workouts where programme_id = $1 order by scheduled_on", [programme]);
    expect(rows).toEqual([
      { slot: 0, scheduled_on: SCHEDULE[0].scheduled_on, status: "completed" },
      { slot: 1, scheduled_on: "2026-10-30", status: "planned" },
    ]);
    const prog = await pool.query("select days_per_week, session_minutes from public.programmes where id = $1", [programme]);
    expect(prog.rows[0]).toEqual({ days_per_week: 2, session_minutes: 15 });
  });
});

describe("resume_family", () => {
  it("unpauses a paused family and records why", async () => {
    const user = await createUser();
    await createProgramme(user);
    await pool.query("update public.user_exercise_progress set paused = true, success_streak = 1 where user_id = $1 and family_id = 'push_up'", [user]);
    await as(user, (c) => c.query("select public.resume_family('push_up')"));
    const p = await pool.query("select paused, success_streak from public.user_exercise_progress where user_id = $1 and family_id = 'push_up'", [user]);
    expect(p.rows[0]).toEqual({ paused: false, success_streak: 0 });
    const e = await pool.query("select kind from public.progression_events where user_id = $1", [user]);
    expect(e.rows).toEqual([{ kind: "resume" }]);
  });

  it("does nothing for a family that isn't paused", async () => {
    const user = await createUser();
    await createProgramme(user);
    await as(user, (c) => c.query("select public.resume_family('squat')"));
    const e = await pool.query("select count(*)::int as n from public.progression_events where user_id = $1", [user]);
    expect(e.rows[0].n).toBe(0);
  });
});

describe("delete_my_account", () => {
  it("removes the account and every row that belongs to it", async () => {
    const user = await createUser();
    const other = await createUser();
    await createProgramme(user);
    await createProgramme(other);
    const session = await startSession(user);
    await as(user, (c) =>
      c.query("insert into public.set_logs (session_id, user_id, item_index, exercise_id, set_number, reps) values ($1, $2, 0, 'wall_push_up', 1, 6)", [session, user]),
    );
    await as(user, (c) => c.query("select public.delete_my_account()"));

    const tables = ["profiles", "onboarding_responses", "training_preferences", "programmes", "scheduled_workouts", "workout_sessions", "set_logs", "user_exercise_progress"];
    for (const table of tables) {
      const column = table === "profiles" ? "id" : "user_id";
      const { rows } = await pool.query(`select count(*)::int as n from public.${table} where ${column} = $1`, [user]);
      expect(rows[0].n, table).toBe(0);
    }
    const users = await pool.query("select id from auth.users where id = any($1)", [[user, other]]);
    expect(users.rows.map((r) => r.id)).toEqual([other]);
  });
});
