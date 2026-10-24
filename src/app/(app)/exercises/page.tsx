import { Bookmark, ChevronRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { inputClasses } from "@/components/ui/field";
import { Chip, Pill } from "@/components/ui/pill";
import { isAvailable } from "@/domain";
import { ExerciseMedia } from "@/features/exercises/exercise-media";
import { filterExercises, LIBRARY_GROUPS, libraryHref, parseLibraryQuery } from "@/features/exercises/library";
import { DIFFICULTY_LABELS, exerciseEquipment, MUSCLE_LABELS } from "@/features/training/format";
import { cn } from "@/lib/cn";
import { getSupabase } from "@/server/auth";
import { getTrainingSnapshot } from "@/server/training";

export const metadata: Metadata = { title: "Exercise library" };

export default async function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  const query = parseLibraryQuery(await searchParams);
  const snapshot = await getTrainingSnapshot();
  const { account } = snapshot;
  const supabase = await getSupabase();
  const { data: savedRows } = await supabase.from("saved_exercises").select("exercise_id").eq("user_id", account.user.id);
  const saved = new Set((savedRows ?? []).map((r: { exercise_id: string }) => r.exercise_id));
  const equipment = account.preferences.equipment;
  const results = filterExercises(query, { equipment, saved });
  const current = new Set([...snapshot.states.values()].map((s) => s.exerciseId));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link href="/workouts" className="eyebrow text-text-secondary hover:text-text-primary">
          Workouts
        </Link>
        <h1 className="font-display text-title font-bold text-white">Exercise library</h1>
        <p className="text-body text-text-secondary">Every movement in the programme, with setup, cues, common mistakes and easier or harder options.</p>
      </div>

      <form action="/exercises" role="search" className="flex gap-2">
        {query.group !== "all" && <input type="hidden" name="group" value={query.group} />}
        {query.mine && <input type="hidden" name="mine" value="1" />}
        <label htmlFor="library-search" className="sr-only">
          Search exercises
        </label>
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
          <input id="library-search" name="q" type="search" defaultValue={query.q} placeholder="Search by name or muscle" className={cn(inputClasses, "min-h-12 pl-12")} />
        </div>
        <button type="submit" className="min-h-12 rounded-card bg-surface-elevated px-4 font-semibold text-text-primary hover:bg-surface-interactive">
          Search
        </button>
      </form>

      <nav aria-label="Exercise groups" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          {LIBRARY_GROUPS.map((g) => {
            const active = query.group === g.id;
            return (
              <li key={g.id} className="shrink-0">
                <Link
                  href={libraryHref({ ...query, group: g.id })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-full px-4 text-body font-semibold",
                    active ? "bg-accent-primary text-text-on-accent" : "bg-surface-secondary text-text-secondary hover:text-text-primary",
                  )}
                >
                  {g.id === "saved" && <Bookmark aria-hidden className="size-4" />}
                  {g.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body text-text-secondary" role="status">
          {results.length === 1 ? "1 exercise" : `${results.length} exercises`}
          {query.q ? ` matching “${query.q}”` : ""}
        </p>
        <Link
          href={libraryHref({ ...query, mine: !query.mine })}
          className="flex min-h-11 items-center gap-2 text-body font-semibold text-text-primary"
          aria-label={query.mine ? "Showing exercises for your equipment. Show all exercises." : "Showing all exercises. Show only exercises for your equipment."}
        >
          <span aria-hidden className={cn("relative h-6 w-10 rounded-full transition-colors", query.mine ? "bg-accent-primary" : "bg-surface-interactive")}>
            <span className={cn("absolute top-1 size-4 rounded-full bg-background-primary transition-[left]", query.mine ? "left-5" : "left-1")} />
          </span>
          My equipment only
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="rounded-card bg-surface-secondary p-6 text-center">
          <p className="font-semibold">{query.group === "saved" ? "No saved exercises yet" : "Nothing matches that search"}</p>
          <p className="text-body text-text-secondary">
            {query.group === "saved" ? "Use the bookmark on any exercise page to keep it here." : "Try a different word, or clear the filters."}
          </p>
          {query.group !== "saved" && (
            <Link href="/exercises" className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent-strong underline-offset-4 hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
          {results.map((e) => {
            const available = isAvailable(e, equipment);
            return (
              <li key={e.id}>
                <Link href={`/exercises/${e.id}`} className="flex min-h-20 items-center gap-3 rounded-card bg-surface-secondary p-2 pr-3 hover:bg-surface-interactive">
                  <ExerciseMedia exerciseId={e.id} className="size-16 shrink-0 [&_p]:hidden [&_svg]:size-5" sizes="64px" />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-text-primary">{e.name}</span>
                      {saved.has(e.id) && <Bookmark aria-label="Saved" className="size-3.5 shrink-0 fill-current text-accent-strong" />}
                    </span>
                    <span className="block truncate text-caption text-text-secondary">
                      {e.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")} · {exerciseEquipment(e)}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <Chip className="px-1.5 py-0.5 text-[0.6875rem]">{DIFFICULTY_LABELS[e.difficulty]}</Chip>
                      {current.has(e.id) && (
                        <Pill tone="success" className="px-1.5 py-0.5 text-[0.625rem]">
                          Your level
                        </Pill>
                      )}
                      {!available && (
                        <Pill tone="outline" className="px-1.5 py-0.5 text-[0.625rem]">
                          Needs equipment
                        </Pill>
                      )}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-text-secondary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
