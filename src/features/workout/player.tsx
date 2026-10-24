"use client";

import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CircleCheck,
  CircleHelp,
  Lightbulb,
  ListChecks,
  Pause,
  Play,
  SkipForward,
  Timer,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Stepper } from "@/components/ui/stepper";
import type { ExerciseFeedback, SkipReason } from "@/domain";
import { MediaFrame } from "@/features/exercises/media-frame";
import { cn } from "@/lib/cn";
import { discardWorkout, finishWorkout, logSet, saveFeedback, swapExercise } from "./actions";
import {
  initialState,
  isItemDone,
  loggedCount,
  nextSetNumber,
  overallProgress,
  playerReducer,
  restRemaining,
  stageOf,
  type FeedbackEntry,
  type PlayerItem,
  type PlayerState,
  type RestState,
} from "./player-state";
import type { ExerciseInfo, SwapOptions } from "./types";

interface WorkoutPlayerProps {
  sessionId: string;
  title: string;
  objective: string;
  notices: string[];
  items: PlayerItem[];
  exercises: Record<string, ExerciseInfo>;
  swaps: Record<number, SwapOptions>;
  initialLogs: PlayerState["logs"];
  initialFeedback: PlayerState["feedback"];
}

const BLOCK_LABEL = { warmup: "Warm-up", main: "Exercise", cooldown: "Cool-down" } as const;

const FEELINGS: { id: ExerciseFeedback; title: string; body: string }[] = [
  { id: "too_easy", title: "Too easy", body: "I could have done a lot more." },
  { id: "about_right", title: "About right", body: "Challenging, with a rep or two left in the tank." },
  { id: "too_difficult", title: "Too difficult", body: "I got through it, but only just." },
  { id: "could_not_finish", title: "Couldn't finish", body: "I couldn't complete all the sets or reps." },
  { id: "pain", title: "Pain or discomfort", body: "Something hurt, beyond normal muscle effort." },
];

const SKIP_REASONS: { id: SkipReason; title: string }[] = [
  { id: "pain", title: "It hurts or feels uncomfortable" },
  { id: "too_hard", title: "It's too hard today" },
  { id: "no_equipment", title: "I don't have what I need" },
  { id: "short_on_time", title: "I'm short on time" },
  { id: "other", title: "Another reason" },
];

function clamp(value: number, [lo, hi]: [number, number]) {
  return Math.min(hi, Math.max(lo, value));
}

function mmss(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function unit(measure: "reps" | "seconds", n = 2) {
  return measure === "seconds" ? (n === 1 ? "second" : "seconds") : n === 1 ? "rep" : "reps";
}

export function WorkoutPlayer(props: WorkoutPlayerProps) {
  const { sessionId, exercises, swaps } = props;
  const [state, dispatch] = useReducer(playerReducer, undefined, () => initialState(props.items, props.initialLogs, props.initialFeedback));
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "swap" | "guide" | "skip" | "end" | "overview">(null);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const storageKey = `form:player:${sessionId}`;
  const restored = useRef(false);

  // Restore the rest timer and pause state after a refresh.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { rest: RestState | null; paused: boolean; current?: number };
        dispatch({ type: "restore", rest: saved.rest, paused: saved.paused, now: Date.now() });
      }
    } catch {
      // Storage unavailable: timers just start fresh.
    }
    restored.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ rest: state.rest, paused: state.paused }));
    } catch {
      // Ignore: persistence of timers is a convenience.
    }
  }, [state.rest, state.paused, storageKey]);

  const ticking = Boolean(state.rest && state.rest.endsAt !== null);
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "tick", now: t });
    }, 250);
    return () => window.clearInterval(id);
  }, [ticking]);

  const restEnded = useRef(false);
  useEffect(() => {
    if (state.rest) restEnded.current = true;
    else if (restEnded.current) {
      restEnded.current = false;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(200);
    }
  }, [state.rest]);

  const stage = stageOf(state);
  const item = state.items[state.current] as PlayerItem | undefined;
  const exercise = item ? exercises[item.exerciseId] : undefined;
  const progress = overallProgress(state);
  const blockItems = item ? state.items.filter((i) => i.block === item.block) : [];
  const blockPosition = item ? blockItems.findIndex((i) => i.index === item.index) + 1 : 0;
  const setNumber = item ? (state.editing ?? nextSetNumber(state, item.index)) : null;
  const target = item && exercise ? clamp(item.plannedTarget, exercise.range) : 0;
  const draftKey = item && setNumber ? `${item.index}:${item.exerciseId}:${setNumber}` : "";
  const draft = drafts[draftKey] ?? (item && setNumber ? (state.logs[item.index]?.[setNumber] ?? target) : target);

  const run = useCallback(
    (task: () => Promise<{ ok: boolean; error?: string } | void>, onOk: () => void) => {
      setError(null);
      startTransition(async () => {
        try {
          const result = await task();
          if (result && !result.ok) {
            setError(result.error ?? "That didn't save. Try again.");
            return;
          }
          onOk();
        } catch (e) {
          // redirect() from a server action surfaces as a thrown error; let Next handle it.
          if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
          setError("That didn't save. Check your connection and try again.");
        }
      });
    },
    [],
  );

  const completeSet = () => {
    if (!item || !setNumber) return;
    const value = Math.max(0, Math.round(draft));
    run(
      () => logSet({ sessionId, itemIndex: item.index, setNumber, value }),
      () => {
        const t = Date.now();
        setNow(t);
        dispatch({ type: "logged", itemIndex: item.index, setNumber, value, now: t });
      },
    );
  };

  const submitFeedback = (entry: FeedbackEntry) => {
    if (!item) return;
    run(
      () => saveFeedback({ sessionId, itemIndex: item.index, difficulty: entry.difficulty, goodControl: entry.goodControl, skippedReason: entry.skipped }),
      () => {
        dispatch({ type: "feedbackSaved", itemIndex: item.index, feedback: entry });
        setDialog(null);
      },
    );
  };

  const chooseSwap = (exerciseId: string) => {
    if (!item) return;
    run(
      () => swapExercise({ sessionId, itemIndex: item.index, exerciseId }),
      () => {
        dispatch({ type: "swapped", itemIndex: item.index, exerciseId });
        setDialog(null);
      },
    );
  };

  const pauseToggle = () => {
    const t = Date.now();
    setNow(t);
    dispatch(state.paused ? { type: "resume", now: t } : { type: "pause", now: t });
  };

  const finish = () => {
    run(
      () => finishWorkout(sessionId),
      () => {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {}
      },
    );
  };

  const discard = () => {
    run(
      () => discardWorkout(sessionId),
      () => {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {}
      },
    );
  };

  const remaining = restRemaining(state.rest, now);
  const resting = Boolean(state.rest) && stage === "set";
  const swapOptions = item ? swaps[item.index] : undefined;
  const canSwap = Boolean(item && swapOptions && (swapOptions.easier.length || swapOptions.same.length || item.exerciseId !== item.plannedExerciseId));

  return (
    <div className="min-h-dvh pb-[calc(2rem+var(--safe-bottom))]">
      <header className="sticky top-0 z-40 bg-background-primary pt-[var(--safe-top)] shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
        <div className="mx-auto grid h-16 max-w-xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
          <button
            type="button"
            onClick={() => setDialog("end")}
            className="-ml-2 flex min-h-11 items-center gap-1 justify-self-start rounded-full px-2 text-body font-semibold text-text-secondary hover:text-text-primary"
          >
            <X aria-hidden className="size-5" /> End
          </button>
          <div className="text-center">
            <h1 className="font-display text-card font-bold text-text-primary">Active workout</h1>
            <p className="eyebrow text-accent-strong">
              {item ? `${BLOCK_LABEL[item.block]} ${blockPosition} of ${blockItems.length}` : "Review"}
            </p>
          </div>
          <button
            type="button"
            onClick={pauseToggle}
            aria-pressed={state.paused}
            className="flex min-h-11 items-center gap-1.5 justify-self-end rounded-full bg-surface-elevated px-4 text-body font-semibold text-text-primary"
          >
            {state.paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
            {state.paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow truncate text-text-secondary">{props.title}</p>
              <p className="font-display text-card font-bold text-white">
                {item ? `${BLOCK_LABEL[item.block]} ${blockPosition} of ${blockItems.length}` : "All exercises done"}
              </p>
            </div>
            {item && setNumber && stage === "set" && (
              <span className="shrink-0 rounded-full bg-surface-elevated px-3 py-1 text-caption font-semibold text-state-success">
                Set {setNumber} of {item.sets}
              </span>
            )}
          </div>
          <ProgressBar value={progress.done} max={progress.total} label="Workout progress" />
        </div>

        {error && (
          <Notice tone="error" title="Not saved">
            {error}
          </Notice>
        )}

        {stage === "review" && <Review state={state} exercises={exercises} onFinish={finish} onGoto={(i) => dispatch({ type: "goto", index: i })} pending={pending} />}

        {item && exercise && stage !== "review" && (
          <>
            <section aria-label="Demonstration" className="overflow-hidden rounded-card bg-surface-secondary">
              <MediaFrame name={exercise.name} photo={exercise.photo} className="h-[16.75rem] rounded-none" priority>
                <span className="absolute left-3 top-3 flex max-w-[calc(100%-6rem)] items-center gap-1.5 rounded-full bg-background-primary/85 px-2.5 py-1 text-caption font-semibold text-white">
                  <Play aria-hidden className="size-3 shrink-0 fill-current text-accent-primary" />
                  <span className="truncate">
                    {BLOCK_LABEL[item.block]} {blockPosition} of {blockItems.length} · {exercise.name}
                  </span>
                </span>
                {exercise.cues[0] && (
                  <div className="absolute inset-x-3 bottom-3 flex items-start gap-2 rounded-small bg-background-primary/90 p-2">
                    <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-strong" />
                    <p className="text-caption text-white">
                      <span className="eyebrow block text-accent-strong">Form tip</span>
                      {exercise.cues[0]}
                    </p>
                  </div>
                )}
              </MediaFrame>
            </section>

            <section aria-labelledby="exercise-name" className="space-y-3 rounded-card bg-surface-elevated p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="exercise-name" className="font-display text-section font-semibold text-white">
                    {exercise.name}
                  </h2>
                  {exercise.surfaces && <p className="text-caption text-text-secondary">{exercise.surfaces}</p>}
                </div>
                <span className="shrink-0 rounded-[6px] bg-success-container px-2 py-1 eyebrow text-success-muted">{exercise.difficultyLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-small bg-surface-interactive p-2">
                <span className="text-body text-text-secondary">Target</span>
                <span className="font-display text-card font-bold text-accent-primary">
                  {target} {unit(item.measure, target)}
                  {item.perSide ? " each side" : ""} · {item.sets} {item.sets === 1 ? "set" : "sets"}
                </span>
              </div>
              {exercise.cues.length > 1 && <p className="text-body text-text-secondary">{exercise.cues.slice(1).join(" ")}</p>}
              {item.note && <p className="text-caption text-text-secondary">{item.note}</p>}
              {item.exerciseId !== item.plannedExerciseId && (
                <p className="text-caption font-semibold text-accent-strong">Swapped from {exercises[item.plannedExerciseId].name.toLowerCase()} for today.</p>
              )}
            </section>

            {stage === "set" && (
              <section aria-labelledby="sets-title" className="space-y-3 rounded-card bg-surface-secondary p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="sets-title" className="eyebrow text-text-secondary">
                    Sets &amp; progress
                  </h2>
                  {state.editing !== null && (
                    <button type="button" onClick={() => dispatch({ type: "edit", setNumber: null })} className="min-h-11 text-caption font-semibold text-text-secondary underline">
                      Cancel edit
                    </button>
                  )}
                  <ol className="flex flex-wrap justify-end gap-1.5">
                  {Array.from({ length: item.sets }, (_, i) => i + 1).map((n) => {
                    const value = state.logs[item.index]?.[n];
                    const active = n === setNumber;
                    return (
                      <li key={n}>
                        <button
                          type="button"
                          disabled={value === undefined || pending}
                          onClick={() => dispatch({ type: "edit", setNumber: n })}
                          aria-label={value !== undefined ? `Set ${n}: ${value} ${unit(item.measure, value)}. Tap to correct.` : `Set ${n}${active ? ", current" : ""}`}
                          className={cn(
                            "flex min-h-11 items-center gap-1 rounded-[6px] px-2.5 text-caption font-bold",
                            value !== undefined && !active && "bg-success-container text-success-muted",
                            active && "bg-accent-primary text-on-accent-muted shadow-[0_0_16px_-4px_rgba(204,241,60,0.6)]",
                            value === undefined && !active && "bg-border-default text-text-secondary",
                          )}
                        >
                          {value !== undefined && !active && <Check aria-hidden className="size-3.5" />}
                          Set {n}
                          {value !== undefined && !active ? ` · ${value}` : active ? " (active)" : ""}
                        </button>
                      </li>
                    );
                  })}
                  </ol>
                </div>

                {resting ? (
                  <RestPanel
                    remaining={remaining}
                    total={state.rest!.total}
                    paused={state.paused}
                    nextSet={setNumber}
                    sets={item.sets}
                    onSkip={() => dispatch({ type: "skipRest" })}
                    onAdd={() => {
                      const t = Date.now();
                      setNow(t);
                      dispatch({ type: "addRest", seconds: 15, now: t });
                    }}
                  />
                ) : item.measure === "seconds" ? (
                  <HoldTimer
                    key={draftKey}
                    target={target}
                    paused={state.paused}
                    value={draft}
                    onChange={(v) => setDrafts((d) => ({ ...d, [draftKey]: v }))}
                  />
                ) : (
                  <Stepper
                    label="Reps completed"
                    unit="Reps"
                    min={0}
                    max={300}
                    value={draft}
                    onChange={(v) => setDrafts((d) => ({ ...d, [draftKey]: v }))}
                    hint={item.perSide ? "Reps on each side. Adjust to what you completed." : "Adjust to the reps you completed."}
                  />
                )}
              </section>
            )}

            {stage === "set" && !resting && setNumber && (
              <Button className="w-full" onClick={completeSet} disabled={pending || state.paused}>
                <CircleCheck aria-hidden className="size-5" />
                {pending ? "Saving…" : state.editing !== null ? `Update set ${setNumber}` : `Mark set ${setNumber} complete`}
              </Button>
            )}

            {stage === "feedback" && <FeedbackForm exercise={exercise} pending={pending} onSubmit={submitFeedback} />}

            {stage === "set" && (
              <div className={cn("grid gap-2", canSwap && "grid-cols-2")}>
                {canSwap && (
                  <Button variant="secondary" size="md" className="px-2" onClick={() => setDialog("swap")}>
                    <ArrowLeftRight aria-hidden className="size-4 shrink-0" /> Easier variation
                  </Button>
                )}
                <Button variant="secondary" size="md" className="px-2" onClick={() => setDialog("guide")}>
                  <CircleHelp aria-hidden className="size-4 shrink-0" /> Technique guide
                </Button>
              </div>
            )}

            {stage === "set" && (
              <div className="flex items-center gap-3 rounded-card bg-surface-secondary p-2">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-small bg-surface-elevated text-accent-strong">
                  <Timer className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-text-secondary">Next up</p>
                  <p className="truncate text-body text-text-primary">
                    {nextUpLabel(state, item, exercises)}
                  </p>
                </div>
                {item.restSeconds > 0 && setNumber !== null && setNumber < item.sets && (
                  <span className="rounded-[4px] bg-border-default px-2 py-1 font-display text-body font-bold tabular-nums">{mmss(item.restSeconds * 1000)}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setDialog("overview")} className="flex min-h-11 items-center gap-1.5 text-body font-semibold text-text-secondary hover:text-text-primary">
                <ListChecks aria-hidden className="size-4" /> All exercises
              </button>
              {!isItemDone(state, item.index) && (
                <button type="button" onClick={() => setDialog("skip")} className="flex min-h-11 items-center gap-1.5 text-body font-semibold text-text-secondary hover:text-text-primary">
                  <SkipForward aria-hidden className="size-4" /> Skip this exercise
                </button>
              )}
            </div>
          </>
        )}
      </main>

      {state.paused && (
        <div role="dialog" aria-modal="true" aria-labelledby="paused-title" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background-primary/95 p-6 text-center">
          <Pause aria-hidden className="size-10 text-accent-primary" />
          <div className="space-y-2">
            <h2 id="paused-title" className="font-display text-display font-bold">
              Workout paused
            </h2>
            <p className="text-body-lg text-text-secondary">Your sets are saved. Timers are on hold.</p>
          </div>
          <Button onClick={pauseToggle} autoFocus className="w-full max-w-xs">
            <Play aria-hidden className="size-5" /> Resume
          </Button>
        </div>
      )}

      {item && exercise && (
        <>
          <Dialog open={dialog === "guide"} onClose={() => setDialog(null)} title={exercise.name}>
            <TechniqueGuide exercise={exercise} />
          </Dialog>
          <Dialog
            open={dialog === "swap"}
            onClose={() => setDialog(null)}
            title="Choose a variation"
            description={loggedCount(state, item.index) > 0 ? "Sets you've logged for this exercise will be cleared, because they were for a different movement." : "Pick an option for today. Your plan moves you back up when you're ready."}
          >
            {swapOptions && <SwapList item={item} options={swapOptions} exercises={exercises} pending={pending} onChoose={chooseSwap} />}
          </Dialog>
          <Dialog open={dialog === "skip"} onClose={() => setDialog(null)} title="Skip this exercise?" description="Skipping is fine. Let us know why so your plan can adjust.">
            <SkipForm pending={pending} onSkip={(reason) => submitFeedback({ difficulty: null, goodControl: null, skipped: reason })} />
          </Dialog>
        </>
      )}
      <Dialog open={dialog === "overview"} onClose={() => setDialog(null)} title="Today's exercises" description={props.objective}>
        {props.notices.length > 0 && (
          <Notice tone="info" className="mb-3">
            {props.notices.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </Notice>
        )}
        <Overview
          state={state}
          exercises={exercises}
          onGoto={(i) => {
            dispatch({ type: "goto", index: i });
            setDialog(null);
          }}
        />
      </Dialog>
      <Dialog open={dialog === "end"} onClose={() => setDialog(null)} title="End this workout?">
        <div className="space-y-3">
          <p className="text-body text-text-secondary">
            Finishing saves what you&apos;ve logged and updates your plan. Exercises you didn&apos;t get to count as skipped, which changes nothing.
          </p>
          <Button className="w-full" onClick={finish} disabled={pending}>
            Finish and save
          </Button>
          <Button variant="secondary" size="md" className="w-full" onClick={() => setDialog(null)}>
            Keep going
          </Button>
          <DiscardButton pending={pending} onConfirm={discard} />
        </div>
      </Dialog>
    </div>
  );
}

function nextUpLabel(state: PlayerState, item: PlayerItem, exercises: Record<string, ExerciseInfo>) {
  const setNumber = nextSetNumber(state, item.index);
  if (setNumber !== null && setNumber < item.sets && item.restSeconds > 0) return `Rest after this set · ${item.restSeconds}s`;
  if (setNumber !== null && setNumber < item.sets) return `Set ${setNumber + 1} of ${item.sets}`;
  if (item.block === "main") return "Tell us how it felt";
  const following = state.items.find((i) => i.index > item.index && !isItemDone(state, i.index));
  return following ? exercises[following.exerciseId].name : "Review and finish";
}

function RestPanel(props: { remaining: number; total: number; paused: boolean; nextSet: number | null; sets: number; onSkip: () => void; onAdd: () => void }) {
  const pct = props.total > 0 ? props.remaining / props.total : 0;
  return (
    <div className="space-y-3 rounded-card bg-surface-elevated p-4 text-center" role="timer" aria-live="off">
      <p className="eyebrow text-accent-strong">{props.paused ? "Rest paused" : "Rest"}</p>
      <p className="font-display text-[3.5rem] font-bold leading-none tabular-nums text-white" aria-label={`Rest: ${Math.ceil(props.remaining / 1000)} seconds left`}>
        {mmss(props.remaining)}
      </p>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-interactive">
        <div className="h-full rounded-full bg-accent-primary transition-[width] duration-200" style={{ width: `${pct * 100}%` }} />
      </div>
      {props.nextSet && (
        <p className="text-body text-text-secondary">
          Next: set {props.nextSet} of {props.sets}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="md" onClick={props.onAdd}>
          +15 s
        </Button>
        <Button variant="secondary" size="md" onClick={props.onSkip}>
          <SkipForward aria-hidden className="size-4" /> Skip rest
        </Button>
      </div>
    </div>
  );
}

/** Countdown for holds. Stopping early records the time actually held. */
function HoldTimer({ target, value, paused, onChange }: { target: number; value: number; paused: boolean; onChange: (v: number) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);

  useEffect(() => {
    if (!running || paused) return;
    startedAt.current = Date.now();
    const id = window.setInterval(() => {
      const total = base.current + (Date.now() - (startedAt.current ?? Date.now()));
      const secs = Math.floor(total / 1000);
      setElapsed(total);
      if (secs >= target) {
        setRunning(false);
        base.current = 0;
        setElapsed(0);
        onChange(target);
        if ("vibrate" in navigator) navigator.vibrate?.(200);
      }
    }, 200);
    return () => {
      window.clearInterval(id);
      if (startedAt.current) base.current += Date.now() - startedAt.current;
      startedAt.current = null;
    };
  }, [running, paused, target, onChange]);

  if (running) {
    const left = Math.max(0, target * 1000 - elapsed);
    return (
      <div className="space-y-3 rounded-card bg-surface-elevated p-4 text-center" role="timer">
        <p className="eyebrow text-accent-strong">Hold</p>
        <p className="font-display text-[3.5rem] font-bold leading-none tabular-nums text-white">{mmss(left)}</p>
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => {
            setRunning(false);
            onChange(Math.floor(elapsed / 1000));
            base.current = 0;
            setElapsed(0);
          }}
        >
          Stop and record {Math.floor(elapsed / 1000)} s
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Stepper label="Seconds held" unit="sec" min={0} max={1800} value={value} onChange={onChange} hint="Adjust to the time you held, or use the timer." />
      <Button variant="secondary" size="md" className="w-full" onClick={() => setRunning(true)}>
        <Timer aria-hidden className="size-4" /> Start {target}-second timer
      </Button>
    </div>
  );
}

function FeedbackForm({ exercise, pending, onSubmit }: { exercise: ExerciseInfo; pending: boolean; onSubmit: (f: FeedbackEntry) => void }) {
  const [feeling, setFeeling] = useState<ExerciseFeedback | null>(null);
  const [control, setControl] = useState<boolean | null>(null);
  const ready = feeling === "pain" || (feeling !== null && control !== null);
  return (
    <section aria-labelledby="feedback-title" className="space-y-4 rounded-card bg-surface-secondary p-4">
      <div className="space-y-1">
        <h2 id="feedback-title" className="font-display text-section font-semibold">
          How did that feel?
        </h2>
        <p className="text-body text-text-secondary">Your answer decides what happens next time.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="sr-only">How did {exercise.name} feel?</legend>
        {FEELINGS.map((f) => (
          <label
            key={f.id}
            className={cn(
              "flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-small border bg-surface-elevated px-3 py-2",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-primary",
              feeling === f.id ? (f.id === "pain" ? "border-state-error" : "border-accent-primary") : "border-transparent",
            )}
          >
            <input type="radio" name="feeling" value={f.id} checked={feeling === f.id} onChange={() => setFeeling(f.id)} className="sr-only" />
            <span>
              <span className={cn("block font-semibold", f.id === "pain" && "text-state-error")}>{f.title}</span>
              <span className="block text-caption text-text-secondary">{f.body}</span>
            </span>
            <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2", feeling === f.id ? "border-accent-primary" : "border-border-default")}>
              {feeling === f.id && <span className="size-2 rounded-full bg-accent-primary" />}
            </span>
          </label>
        ))}
      </fieldset>

      {feeling === "pain" && (
        <div className="flex gap-3 rounded-small bg-error-tint p-3" role="alert">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-state-error" />
          <p className="text-body text-text-primary">
            Stop this exercise for today. Pain isn&apos;t something to push through. Next time you&apos;ll get an easier option, and if it keeps
            happening the movement is paused. If pain continues, see a GP or physiotherapist.
          </p>
        </div>
      )}

      {feeling && feeling !== "pain" && (
        <fieldset className="space-y-2">
          <legend className="pb-1 font-semibold">Did you keep good control?</legend>
          <p className="text-caption text-text-secondary">{exercise.goodControl}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, label: "Yes" },
              { v: false, label: "Not really" },
            ].map(({ v, label }) => (
              <label
                key={label}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-center rounded-small border bg-surface-elevated font-semibold",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-primary",
                  control === v ? "border-accent-primary text-accent-primary" : "border-transparent",
                )}
              >
                <input type="radio" name="control" checked={control === v} onChange={() => setControl(v)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Button
        className="w-full"
        disabled={!ready || pending}
        onClick={() => feeling && onSubmit({ difficulty: feeling, goodControl: feeling === "pain" ? null : control, skipped: null })}
      >
        {pending ? "Saving…" : "Save and continue"} <ArrowRight aria-hidden className="size-5" />
      </Button>
    </section>
  );
}

function TechniqueGuide({ exercise }: { exercise: ExerciseInfo }) {
  return (
    <div className="space-y-4 text-body">
      {exercise.setup.length > 0 && (
        <div>
          <h3 className="eyebrow pb-1 text-accent-strong">Set up</h3>
          <ul className="list-disc space-y-1 pl-5 text-text-secondary">
            {exercise.setup.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="eyebrow pb-1 text-accent-strong">How to do it</h3>
        <ol className="list-decimal space-y-1 pl-5 text-text-secondary">
          {exercise.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="eyebrow pb-1 text-accent-strong">Good control looks like</h3>
        <p className="text-text-secondary">{exercise.goodControl}</p>
      </div>
      <div>
        <h3 className="eyebrow pb-1 text-accent-strong">Breathing</h3>
        <p className="text-text-secondary">{exercise.breathing}</p>
      </div>
      {exercise.mistakes.length > 0 && (
        <div>
          <h3 className="eyebrow pb-1 text-state-error">Common mistakes</h3>
          <ul className="list-disc space-y-1 pl-5 text-text-secondary">
            {exercise.mistakes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {exercise.safety.length > 0 && (
        <div className="rounded-small bg-error-tint p-3">
          <h3 className="eyebrow pb-1 text-state-error">Stop if you feel pain</h3>
          <ul className="list-disc space-y-1 pl-5 text-text-primary">
            {exercise.safety.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <Link href={`/exercises/${exercise.id}`} target="_blank" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent-strong underline-offset-4 hover:underline">
        Open the full exercise page <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

function SwapList({ item, options, exercises, pending, onChoose }: { item: PlayerItem; options: SwapOptions; exercises: Record<string, ExerciseInfo>; pending: boolean; onChoose: (id: string) => void }) {
  const easier = options.easier.filter((id) => id !== item.exerciseId);
  const same = options.same.filter((id) => id !== item.exerciseId);
  const back = item.exerciseId !== item.plannedExerciseId ? item.plannedExerciseId : null;
  const row = (id: string, tag: string) => (
    <li key={id}>
      <button
        type="button"
        disabled={pending}
        onClick={() => onChoose(id)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-small bg-surface-secondary px-3 py-2 text-left hover:bg-surface-interactive disabled:opacity-50"
      >
        <span>
          <span className="block font-semibold text-text-primary">{exercises[id].name}</span>
          <span className="block text-caption text-text-secondary">
            {tag} · {exercises[id].range[0]}–{exercises[id].range[1]} {unit(exercises[id].measure)}
          </span>
        </span>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-text-secondary" />
      </button>
    </li>
  );
  return (
    <div className="space-y-4">
      {back && (
        <ul>
          {row(back, "Back to the planned exercise")}
        </ul>
      )}
      {easier.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow text-text-secondary">Easier</h3>
          <ul className="space-y-2">
            {easier.map((id) => row(id, exercises[id].difficultyLabel))}
          </ul>
        </div>
      )}
      {same.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow text-text-secondary">Similar level</h3>
          <ul className="space-y-2">
            {same.map((id) => row(id, exercises[id].difficultyLabel))}
          </ul>
        </div>
      )}
      {!back && easier.length === 0 && same.length === 0 && <p className="text-body text-text-secondary">This is already the easiest option available with your equipment.</p>}
    </div>
  );
}

function SkipForm({ pending, onSkip }: { pending: boolean; onSkip: (reason: SkipReason) => void }) {
  const [reason, setReason] = useState<SkipReason | null>(null);
  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="sr-only">Reason for skipping</legend>
        {SKIP_REASONS.map((r) => (
          <label
            key={r.id}
            className={cn(
              "flex min-h-12 cursor-pointer items-center rounded-small border bg-surface-secondary px-3",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-primary",
              reason === r.id ? "border-accent-primary" : "border-transparent",
            )}
          >
            <input type="radio" name="skip" checked={reason === r.id} onChange={() => setReason(r.id)} className="sr-only" />
            {r.title}
          </label>
        ))}
      </fieldset>
      {reason === "pain" && (
        <p className="rounded-small bg-error-tint p-3 text-body">
          Good call to stop. Next time you&apos;ll get an easier option. If the pain continues, see a GP or physiotherapist.
        </p>
      )}
      <Button className="w-full" disabled={!reason || pending} onClick={() => reason && onSkip(reason)}>
        {pending ? "Saving…" : "Skip exercise"}
      </Button>
    </div>
  );
}

function Overview({ state, exercises, onGoto }: { state: PlayerState; exercises: Record<string, ExerciseInfo>; onGoto: (i: number) => void }) {
  return (
    <ol className="space-y-2">
      {state.items.map((item) => {
        const done = isItemDone(state, item.index);
        const skipped = state.feedback[item.index]?.skipped;
        return (
          <li key={item.index}>
            <button
              type="button"
              onClick={() => onGoto(item.index)}
              aria-current={item.index === state.current ? "step" : undefined}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-small px-3 py-2 text-left",
                item.index === state.current ? "bg-surface-interactive ring-1 ring-accent-primary" : "bg-surface-secondary hover:bg-surface-interactive",
              )}
            >
              <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", done ? "bg-success-container text-state-success" : "bg-border-default text-text-secondary")}>
                {done ? <Check className="size-4" /> : <span className="text-caption font-bold">{item.index + 1}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{exercises[item.exerciseId].name}</span>
                <span className="block text-caption text-text-secondary">
                  {BLOCK_LABEL[item.block]} · {skipped ? "Skipped" : `${loggedCount(state, item.index)} of ${item.sets} sets`}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Review({ state, exercises, onFinish, onGoto, pending }: { state: PlayerState; exercises: Record<string, ExerciseInfo>; onFinish: () => void; onGoto: (i: number) => void; pending: boolean }) {
  const main = state.items.filter((i) => i.block === "main");
  const totals = useMemo(() => {
    let sets = 0;
    let reps = 0;
    for (const item of state.items) {
      const logged = Object.values(state.logs[item.index] ?? {});
      sets += logged.length;
      if (item.measure === "reps") reps += logged.reduce((a, b) => a + b, 0);
    }
    return { sets, reps };
  }, [state]);
  return (
    <section aria-labelledby="review-title" className="space-y-4">
      <div className="space-y-2 rounded-card bg-surface-elevated p-4">
        <p className="eyebrow text-accent-primary">Nice work</p>
        <h2 id="review-title" className="font-display text-title font-bold">
          Every exercise done
        </h2>
        <p className="text-body text-text-secondary">
          {totals.sets} sets and {totals.reps} reps logged. Finish to save the workout and see what changes next time.
        </p>
      </div>
      <ol className="space-y-2">
        {main.map((item) => {
          const fb = state.feedback[item.index];
          const values = Object.entries(state.logs[item.index] ?? {}).sort(([a], [b]) => Number(a) - Number(b)).map(([, v]) => v);
          return (
            <li key={item.index}>
              <button type="button" onClick={() => onGoto(item.index)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-small bg-surface-secondary px-3 py-2 text-left hover:bg-surface-interactive">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{exercises[item.exerciseId].name}</span>
                  <span className="block text-caption text-text-secondary">
                    {fb?.skipped ? "Skipped" : values.length ? `${values.join(" · ")} ${unit(item.measure)}` : "No sets logged"}
                    {fb?.difficulty ? ` · ${FEELINGS.find((f) => f.id === fb.difficulty)?.title}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-caption font-semibold text-text-secondary">Edit</span>
              </button>
            </li>
          );
        })}
      </ol>
      <Button className="w-full" onClick={onFinish} disabled={pending}>
        <CircleCheck aria-hidden className="size-5" /> {pending ? "Saving…" : "Finish workout"}
      </Button>
    </section>
  );
}

function DiscardButton({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="flex min-h-11 w-full items-center justify-center text-body font-semibold text-state-error underline-offset-4 hover:underline">
        Discard this workout
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-small bg-error-tint p-3">
      <p className="text-body">Discarding means none of today&apos;s sets count towards your progress. This can&apos;t be undone.</p>
      <Button variant="danger" size="md" className="w-full" onClick={onConfirm} disabled={pending}>
        Yes, discard it
      </Button>
    </div>
  );
}
