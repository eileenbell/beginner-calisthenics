import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, ChevronDown, CircleX, ShieldAlert, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { easierLibraryOptions, EXERCISES_BY_ID, getFamily, harderOptions, isAvailable, rangeOf, type Exercise } from "@/domain";
import { toggleSavedExercise } from "@/features/exercises/actions";
import { ExerciseMedia } from "@/features/exercises/exercise-media";
import { relatedPathway } from "@/features/exercises/library";
import { DIFFICULTY_LABELS, exerciseEquipment, MUSCLE_LABELS, shortEquipment } from "@/features/training/format";
import { startWorkout } from "@/features/workout/actions";
import { getSupabase } from "@/server/auth";
import { getTrainingSnapshot, nextSession, planSession } from "@/server/training";

export async function generateMetadata({ params }: PageProps<"/exercises/[exerciseId]">): Promise<Metadata> {
  const { exerciseId } = await params;
  return { title: EXERCISES_BY_ID.get(exerciseId)?.name ?? "Exercise" };
}

function dose(e: Exercise): { main: string; detail: string } {
  const [lo, hi] = rangeOf(e);
  const [sLo, sHi] = e.dosage.sets;
  const unit = e.measure === "seconds" ? "seconds" : "reps";
  return {
    main: sLo === sHi ? `${sLo} ${sLo === 1 ? "set" : "sets"}` : `${sLo}–${sHi} sets`,
    detail: `${lo}–${hi} ${unit}${e.perSide ? " each side" : ""}`,
  };
}

function Option({ exercise, kind, available }: { exercise: Exercise; kind: "easier" | "harder" | "similar"; available: boolean }) {
  const Icon = kind === "easier" ? ArrowDownRight : kind === "harder" ? ArrowUpRight : ArrowRight;
  const label = kind === "easier" ? "Easier variation" : kind === "harder" ? "Harder variation" : "Similar level";
  return (
    <li>
      <Link href={`/exercises/${exercise.id}`} className="flex min-h-16 items-center gap-3 rounded-card bg-surface-secondary p-3 hover:bg-surface-interactive">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-small bg-surface-interactive text-accent-strong">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block text-accent-strong">{label}</span>
          <span className="block font-semibold text-text-primary">{exercise.name}</span>
          <span className="block text-caption text-text-secondary">
            {DIFFICULTY_LABELS[exercise.difficulty]} · {exerciseEquipment(exercise)}
            {available ? "" : " · needs equipment you haven't listed"}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function ExercisePage({ params }: PageProps<"/exercises/[exerciseId]">) {
  const { exerciseId } = await params;
  const exercise = EXERCISES_BY_ID.get(exerciseId);
  if (!exercise) notFound();

  const snapshot = await getTrainingSnapshot();
  const { account } = snapshot;
  const supabase = await getSupabase();
  const { data: savedRow } = await supabase.from("saved_exercises").select("exercise_id").eq("user_id", account.user.id).eq("exercise_id", exercise.id).maybeSingle();
  const saved = Boolean(savedRow);
  const equipment = account.preferences.equipment;
  const family = exercise.familyId ? getFamily(exercise.familyId) : null;
  const ladderStep = family ? family.ladder.indexOf(exercise.id) + 1 : 0;
  const pathway = relatedPathway(exercise);
  const state = exercise.familyId ? snapshot.states.get(exercise.familyId) : undefined;
  const isCurrent = state?.exerciseId === exercise.id;
  const easier = easierLibraryOptions(exercise.id);
  const harder = harderOptions(exercise.id);
  const similar = exercise.alternatives.map((id) => EXERCISES_BY_ID.get(id)).filter((e): e is Exercise => Boolean(e));
  const d = dose(exercise);

  // Contextual action: carry on with a workout that includes this exercise, or start today's.
  const next = nextSession(snapshot);
  const inNext =
    next.slot && next.kind !== "upcoming" && next.kind !== "resume"
      ? planSession(snapshot, next.slot.template, next.slot.week).items.some((i) => i.exerciseId === exercise.id)
      : false;

  const steps = [
    ...(exercise.setup.length ? [{ title: "Set up", body: exercise.setup.join(" ") }] : []),
    ...exercise.steps.map((body, i) => ({ title: exercise.setup.length ? `Step ${i + 2}` : `Step ${i + 1}`, body })),
  ];

  return (
    <article className="space-y-6" aria-labelledby="exercise-title">
      <div className="flex items-start gap-2">
        <Link href="/exercises" aria-label="Back to the exercise library" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:text-accent-primary">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 flex-1 pt-1 text-center">
          <p className="eyebrow text-text-secondary">{family?.name ?? (exercise.category === "cooldown" ? "Cool-down" : "Warm-up and mobility")}</p>
          <h1 id="exercise-title" className="font-display text-section font-bold text-white">
            {exercise.name}
          </h1>
        </div>
        <form action={toggleSavedExercise}>
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <input type="hidden" name="save" value={saved ? "0" : "1"} />
          <button
            type="submit"
            aria-pressed={saved}
            aria-label={saved ? "Saved. Remove from saved exercises" : "Save this exercise"}
            className="flex size-11 items-center justify-center rounded-full text-text-primary hover:text-accent-primary"
          >
            <Bookmark aria-hidden className={saved ? "size-5 fill-accent-primary text-accent-primary" : "size-5"} />
          </button>
        </form>
      </div>

      <div className="desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] desktop:gap-8">
        <div className="space-y-4">
          <ExerciseMedia exerciseId={exercise.id} className="aspect-[4/3] w-full rounded-card" priority>
            <span className="absolute left-3 top-3 rounded-full bg-background-primary/85 px-2.5 py-1 text-caption font-semibold text-white">Demonstration: {exercise.name}</span>
          </ExerciseMedia>

          <dl className="grid grid-cols-3 divide-x divide-border-default rounded-card bg-surface-secondary py-3 text-center">
            <div className="px-2">
              <dt className="eyebrow text-text-secondary">Difficulty</dt>
              <dd className="font-semibold text-accent-strong">{DIFFICULTY_LABELS[exercise.difficulty]}</dd>
              {ladderStep > 0 && <dd className="text-caption text-text-secondary">Stage {ladderStep}</dd>}
            </div>
            <div className="px-2">
              <dt className="eyebrow text-text-secondary">Equipment</dt>
              <dd className="font-semibold text-text-primary">{shortEquipment(exercise)}</dd>
            </div>
            <div className="px-2">
              <dt className="eyebrow text-text-secondary">Typical dose</dt>
              <dd className="font-semibold text-text-primary">{d.main}</dd>
              <dd className="text-caption text-text-secondary">{d.detail}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {isCurrent && <Pill tone="success">Your current level</Pill>}
            {!isAvailable(exercise, equipment) && <Pill tone="outline">Needs equipment you haven&apos;t listed</Pill>}
          </div>

          {exercise.surfaces && (
            <p className="text-body text-text-secondary">
              <span className="font-semibold text-text-primary">You&apos;ll need: </span>
              {exercise.surfaces}
            </p>
          )}

          <p className="text-body-lg text-text-secondary">{exercise.why}</p>

          {exercise.limitationNote && <p className="rounded-small bg-surface-interactive p-3 text-body text-text-secondary">{exercise.limitationNote}</p>}
        </div>

        <div className="mt-6 space-y-6 desktop:mt-0">
          <section aria-labelledby="how-to" className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="how-to" className="font-display text-card font-semibold text-white">
                How to do this exercise
              </h2>
              <span className="eyebrow text-accent-strong">Step by step</span>
            </div>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3 rounded-card bg-surface-secondary p-3">
                  <span
                    aria-hidden
                    className={
                      i === 0
                        ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-primary font-display font-bold text-text-on-accent"
                        : "flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-interactive font-display font-bold text-text-primary"
                    }
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-text-primary">{s.title}</span>
                    <span className="block text-body text-text-secondary">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <dl className="space-y-2 rounded-card bg-surface-secondary p-3 text-body">
              <div>
                <dt className="eyebrow text-accent-strong">Good control looks like</dt>
                <dd className="text-text-secondary">{exercise.goodControl}</dd>
              </div>
              <div>
                <dt className="eyebrow text-accent-strong">Breathing</dt>
                <dd className="text-text-secondary">{exercise.breathing}</dd>
              </div>
              {exercise.cues.length > 0 && (
                <div>
                  <dt className="eyebrow text-accent-strong">Cues to remember</dt>
                  <dd className="text-text-secondary">{exercise.cues.join(" · ")}</dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="pain" className="flex gap-3 rounded-card border border-state-error/40 bg-error-tint p-4">
            <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-state-error" />
            <div className="space-y-1">
              <h2 id="pain" className="font-semibold text-text-primary">
                Stop if you feel pain
              </h2>
              <ul className="list-disc space-y-1 pl-4 text-body text-text-secondary">
                {exercise.safety.map((s) => (
                  <li key={s}>{s}</li>
                ))}
                <li>If pain continues after you stop, see a GP or physiotherapist.</li>
              </ul>
            </div>
          </section>

          {exercise.mistakes.length > 0 && (
            <section aria-labelledby="mistakes" className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="mistakes" className="eyebrow text-text-secondary">
                  Form check
                </h2>
                <span className="eyebrow text-accent-strong">Common mistakes</span>
              </div>
              <ul className="space-y-2">
                {exercise.mistakes.map((m) => (
                  <li key={m} className="flex gap-3 rounded-card bg-surface-secondary p-3 text-body text-text-primary">
                    <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-state-error" />
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(easier.length > 0 || harder.length > 0 || similar.length > 0) && (
            <section aria-labelledby="adaptations" className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="adaptations" className="eyebrow text-text-secondary">
                  Adaptations
                </h2>
                <span className="eyebrow text-accent-strong">Easier &amp; harder options</span>
              </div>
              <ul className="space-y-2">
                {easier.slice(0, 2).map((e) => (
                  <Option key={e.id} exercise={e} kind="easier" available={isAvailable(e, equipment)} />
                ))}
                {harder.slice(0, 2).map((e) => (
                  <Option key={e.id} exercise={e} kind="harder" available={isAvailable(e, equipment)} />
                ))}
                {similar.slice(0, 2).map((e) => (
                  <Option key={e.id} exercise={e} kind="similar" available={isAvailable(e, equipment)} />
                ))}
              </ul>
              {harder.length > 0 && (
                <p className="text-caption text-text-secondary">Your plan moves you to a harder variation on its own once you&apos;re consistently at the top of the range with good control.</p>
              )}
            </section>
          )}

          <details className="group rounded-card bg-surface-secondary">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-primary">Muscles worked</span>
                <span className="block truncate text-caption text-text-secondary">{exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}</span>
              </span>
              <ChevronDown aria-hidden className="size-5 shrink-0 text-text-secondary transition-transform group-open:rotate-180" />
            </summary>
            <dl className="space-y-2 px-3 pb-3 text-body">
              <div>
                <dt className="eyebrow text-text-secondary">Main</dt>
                <dd>{exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}</dd>
              </div>
              {exercise.secondaryMuscles.length > 0 && (
                <div>
                  <dt className="eyebrow text-text-secondary">Also working</dt>
                  <dd>{exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}</dd>
                </div>
              )}
            </dl>
          </details>

          {pathway && (
            <Link href={`/skills/${pathway.id}`} className="flex min-h-14 items-center gap-3 rounded-card bg-surface-secondary p-3 hover:bg-surface-interactive">
              <Workflow aria-hidden className="size-5 shrink-0 text-accent-strong" />
              <span className="min-w-0 flex-1">
                <span className="eyebrow block text-text-secondary">Related skill</span>
                <span className="block font-semibold">{pathway.title}</span>
              </span>
              <ArrowRight aria-hidden className="size-4 text-text-secondary" />
            </Link>
          )}

          <p className="text-caption text-text-secondary">
            {exercise.validation.status === "professional_review"
              ? "This guidance has been reviewed by a qualified professional."
              : "This guidance was written from published coaching and exercise-science sources and checked internally. It hasn't yet been reviewed by a physiotherapist or accredited exercise professional."}
          </p>

          {next.kind === "resume" && snapshot.inProgress ? (
            <LinkButton href={`/workout/${snapshot.inProgress.id}`} className="w-full">
              Back to your workout <ArrowRight aria-hidden className="size-5" />
            </LinkButton>
          ) : inNext && next.slot ? (
            <form action={startWorkout}>
              <input type="hidden" name="scheduledWorkoutId" value={next.slot.id} />
              <SubmitButton className="w-full" pendingLabel="Starting…">
                Start today&apos;s workout <ArrowRight aria-hidden className="size-5" />
              </SubmitButton>
              <p className="pt-2 text-center text-caption text-text-secondary">This exercise is in today&apos;s session.</p>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
