import {
  addDays,
  TEMPLATE_TITLES,
  daysBetween,
  getExercise,
  getFamily,
  type Equipment,
  type Exercise,
  type FamilyId,
  type Muscle,
  type PlannedItem,
  type SessionPlan,
  type SessionTemplate,
} from "@/domain";

// Display helpers shared by the dashboard, player, library and progress screens.

export const TEMPLATE_FOCUS: Record<SessionTemplate, { label: string; tag: string }> = {
  A: { label: "Full body", tag: "Full Body" },
  B: { label: "Full body", tag: "Full Body" },
  U: { label: "Upper body", tag: "Upper Body" },
  L: { label: "Lower body and core", tag: "Lower Body" },
};

export const DIFFICULTY_LABELS: Record<Exercise["difficulty"], string> = {
  1: "Foundation",
  2: "Beginner",
  3: "Developing",
  4: "Intermediate",
  5: "Advanced",
};

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms_grip: "Forearms and grip",
  lats: "Lats",
  upper_back: "Upper back",
  lower_back: "Lower back",
  abdominals: "Abdominals",
  obliques: "Obliques",
  glutes: "Glutes",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves",
  hip_flexors: "Hip flexors",
  wrists: "Wrists",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: "No equipment",
  mat: "Mat",
  bands: "Resistance bands",
  pullup_bar: "Pull-up bar",
  low_bar: "Low bar",
  parallel_bars: "Parallel bars",
  rings: "Rings",
  gym: "Gym",
};

export const PATTERN_LABELS: Record<Exercise["pattern"], string> = {
  squat: "Legs",
  lunge: "Legs",
  hinge: "Hips",
  horizontal_push: "Push",
  vertical_push: "Push",
  horizontal_pull: "Pull",
  vertical_pull: "Pull",
  core_anti_extension: "Core",
  core_anti_rotation: "Core",
  core_lateral: "Core",
  support: "Push",
  mobility: "Mobility",
};

export function unitOf(measure: PlannedItem["measure"], value = 2): string {
  if (measure === "seconds") return value === 1 ? "second" : "seconds";
  return value === 1 ? "rep" : "reps";
}

export function shortUnit(measure: PlannedItem["measure"]): string {
  return measure === "seconds" ? "s" : "reps";
}

/** "3 × 8–10" or "2 × 20–30 s", with "each side" when needed. */
export function formatPrescription(item: Pick<PlannedItem, "sets" | "range" | "measure" | "perSide">): string {
  const [lo, hi] = item.range;
  const range = lo === hi ? `${lo}` : `${lo}–${hi}`;
  const unit = item.measure === "seconds" ? " s" : "";
  return `${item.sets} × ${range}${unit}${item.perSide ? " each side" : ""}`;
}

/** "10 reps" / "30 seconds", plus "each side". */
export function formatTarget(item: Pick<PlannedItem, "target" | "measure" | "perSide">): string {
  return `${item.target} ${unitOf(item.measure, item.target)}${item.perSide ? " each side" : ""}`;
}

export function mainItems(plan: SessionPlan): PlannedItem[] {
  return plan.items.filter((i) => i.block === "main");
}

/** Equipment or surfaces a session needs, in plain words. */
export function sessionEquipment(plan: SessionPlan): { short: string; detail: string } {
  const exercises = mainItems(plan).map((i) => getExercise(i.exerciseId));
  const kit = new Set<Equipment>();
  for (const e of exercises) {
    for (const k of e.equipmentAllOf ?? []) kit.add(k);
    if (e.equipmentAnyOf.length) kit.add(e.equipmentAnyOf[0]);
  }
  kit.delete("none");
  const surfaces = exercises.some((e) => e.surfaces && /counter|bench|table|desk|benchtop/i.test(e.surfaces));
  if (kit.size) {
    const names = [...kit].map((k) => EQUIPMENT_LABELS[k]);
    return { short: names[0] + (names.length > 1 ? ` +${names.length - 1}` : ""), detail: names.join(", ") };
  }
  if (surfaces) return { short: "Counter/\u200bTable", detail: "Sturdy surface" };
  return { short: "None", detail: "Floor and wall" };
}

/** What one exercise needs, in plain words: "Pull-up bar or rings", "A clear wall", "No equipment". */
export function exerciseEquipment(exercise: Exercise): string {
  const any = exercise.equipmentAnyOf.filter((e) => e !== "none").map((e) => EQUIPMENT_LABELS[e]);
  const all = (exercise.equipmentAllOf ?? []).map((e) => EQUIPMENT_LABELS[e]);
  const parts = [...all, any.length ? any.join(" or ") : null].filter(Boolean);
  if (parts.length) return parts.join(" and ");
  return exercise.surfaces ?? "No equipment";
}

/** A few words for tight spaces such as stat columns. */
export function shortEquipment(exercise: Exercise): string {
  const kit = [...(exercise.equipmentAllOf ?? []), ...exercise.equipmentAnyOf.filter((e) => e !== "none").slice(0, 1)];
  if (kit.length) return kit.map((e) => EQUIPMENT_LABELS[e]).join(" + ");
  const s = exercise.surfaces ?? "";
  if (/counter|bench|table|desk|benchtop|step|chair|couch|platform/i.test(s)) return "Sturdy surface";
  if (/wall/i.test(s)) return "A wall";
  if (/towel|mat/i.test(s)) return "Floor and mat";
  return "None";
}

export function familyName(id: FamilyId | null): string {
  return id ? getFamily(id).name : "Mobility";
}

const WEEKDAY = new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" });
const WEEKDAY_LONG = new Intl.DateTimeFormat("en-AU", { weekday: "long", timeZone: "UTC" });
const DAY_MONTH = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const FULL_DATE = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function weekdayShort(iso: string): string {
  return WEEKDAY.format(asDate(iso));
}

export function weekdayLetter(iso: string): string {
  return WEEKDAY.format(asDate(iso)).charAt(0);
}

export function weekdayLong(iso: string): string {
  return WEEKDAY_LONG.format(asDate(iso));
}

export function dayMonth(iso: string): string {
  return DAY_MONTH.format(asDate(iso));
}

export function fullDate(iso: string): string {
  return FULL_DATE.format(asDate(iso));
}

/** "Today", "Tomorrow", "Yesterday" or "Mon 26 Oct". */
export function relativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return `${weekdayShort(iso)} ${dayMonth(iso)}`;
}

export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Hour of the day (0–23) in a time zone. */
export function hourIn(now: Date, timeZone: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-AU", { hour: "numeric", hourCycle: "h23", timeZone }).format(now);
    return Number(h) % 24;
  } catch {
    return now.getUTCHours();
  }
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Engine notices can repeat or contain one another (a fallback family's note is appended to its parent's). */
export function uniqueNotices(notices: string[]): string[] {
  const unique = Array.from(new Set(notices));
  return unique.filter((n) => !unique.some((other) => other !== n && other.includes(n)));
}

export { addDays, TEMPLATE_TITLES };
