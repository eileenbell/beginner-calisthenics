import { EXERCISES, isAvailable, type Equipment, type Exercise } from "@/domain";
import { PATHWAYS, type PathwayDef } from "@/features/training/pathways";

// Exercise library filtering. Pure functions so the list page, its tests and
// any later API all agree on what a filter means.

export type LibraryGroup = "all" | "push" | "pull" | "legs" | "core" | "mobility" | "saved";

export const LIBRARY_GROUPS: { id: LibraryGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "mobility", label: "Warm-up & mobility" },
  { id: "saved", label: "Saved" },
];

export function exerciseGroup(exercise: Exercise): Exclude<LibraryGroup, "all" | "saved"> {
  if (exercise.category === "warmup" || exercise.category === "cooldown" || exercise.pattern === "mobility") return "mobility";
  switch (exercise.pattern) {
    case "horizontal_push":
    case "vertical_push":
    case "support":
      return "push";
    case "horizontal_pull":
    case "vertical_pull":
      return "pull";
    case "squat":
    case "lunge":
    case "hinge":
      return "legs";
    default:
      return "core";
  }
}

export interface LibraryQuery {
  q?: string;
  group?: LibraryGroup;
  /** Only exercises the user can do with their equipment. */
  mine?: boolean;
}

export function parseLibraryQuery(params: Record<string, string | string[] | undefined>): Required<LibraryQuery> {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const group = one(params.group) as LibraryGroup;
  return {
    q: one(params.q).trim().slice(0, 60),
    group: LIBRARY_GROUPS.some((g) => g.id === group) ? group : "all",
    mine: one(params.mine) === "1",
  };
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[-–]/g, " ").replace(/\s+/g, " ").trim();
}

export function filterExercises(
  query: LibraryQuery,
  context: { equipment: readonly Equipment[]; saved: ReadonlySet<string> },
  exercises: readonly Exercise[] = EXERCISES,
): Exercise[] {
  const q = normalise(query.q ?? "");
  return exercises
    .filter((e) => {
      if (query.group === "saved") return context.saved.has(e.id);
      if (query.group && query.group !== "all" && exerciseGroup(e) !== query.group) return false;
      return true;
    })
    .filter((e) => !query.mine || isAvailable(e, context.equipment))
    .filter((e) => {
      if (!q) return true;
      const haystack = normalise([e.name, e.surfaces ?? "", ...e.primaryMuscles, ...e.secondaryMuscles].join(" ").replace(/_/g, " "));
      return q.split(" ").every((word) => haystack.includes(word));
    })
    .sort((a, b) => groupOrder(a) - groupOrder(b) || (a.familyId ?? "").localeCompare(b.familyId ?? "") || a.level - b.level || a.name.localeCompare(b.name));
}

const ORDER: Exclude<LibraryGroup, "all" | "saved">[] = ["push", "pull", "legs", "core", "mobility"];
function groupOrder(e: Exercise): number {
  return ORDER.indexOf(exerciseGroup(e));
}

/** The skill pathway an exercise trains, if any. */
export function relatedPathway(exercise: Exercise): PathwayDef | null {
  if (!exercise.familyId) return null;
  return PATHWAYS.find((p) => p.family === exercise.familyId) ?? null;
}

export function libraryHref(query: LibraryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.group && query.group !== "all") params.set("group", query.group);
  if (query.mine) params.set("mine", "1");
  const s = params.toString();
  return s ? `/exercises?${s}` : "/exercises";
}
