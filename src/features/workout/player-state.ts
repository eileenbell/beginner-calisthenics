import type { ExerciseFeedback, PlannedItem, SkipReason } from "@/domain";

// The workout player as a pure state machine, so the rules (which set is
// next, when rest starts, when an exercise is finished) are unit-tested
// separately from the UI. Times are passed in, never read from a clock here.

export interface PlayerItem {
  index: number;
  block: PlannedItem["block"];
  sets: number;
  measure: PlannedItem["measure"];
  perSide: boolean;
  plannedTarget: number;
  restSeconds: number;
  plannedExerciseId: string;
  exerciseId: string;
  familyId: string | null;
  note?: string;
}

export interface FeedbackEntry {
  difficulty: ExerciseFeedback | null;
  goodControl: boolean | null;
  skipped: SkipReason | null;
}

export interface RestState {
  /** Epoch ms when rest ends; null while paused. */
  endsAt: number | null;
  /** Remaining ms, kept while paused. */
  remaining: number;
  total: number;
}

export interface PlayerState {
  items: PlayerItem[];
  /** itemIndex -> setNumber -> reps or seconds */
  logs: Record<number, Record<number, number>>;
  feedback: Record<number, FeedbackEntry>;
  current: number;
  /** Set being re-entered, if the user tapped a finished set. */
  editing: number | null;
  rest: RestState | null;
  paused: boolean;
}

export type PlayerAction =
  | { type: "logged"; itemIndex: number; setNumber: number; value: number; now: number }
  | { type: "edit"; setNumber: number | null }
  | { type: "skipRest" }
  | { type: "addRest"; seconds: number; now: number }
  | { type: "tick"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "feedbackSaved"; itemIndex: number; feedback: FeedbackEntry }
  | { type: "swapped"; itemIndex: number; exerciseId: string }
  | { type: "goto"; index: number }
  | { type: "restore"; rest: RestState | null; paused: boolean; now: number };

export function loggedCount(state: Pick<PlayerState, "logs">, itemIndex: number): number {
  return Object.keys(state.logs[itemIndex] ?? {}).length;
}

/** The next set to do for an item (1-based), or null when every set is logged. */
export function nextSetNumber(state: Pick<PlayerState, "logs" | "items">, itemIndex: number): number | null {
  const item = state.items[itemIndex];
  const logged = state.logs[itemIndex] ?? {};
  for (let n = 1; n <= item.sets; n++) if (logged[n] === undefined) return n;
  return null;
}

export function needsFeedback(item: PlayerItem): boolean {
  return item.block === "main";
}

export function isItemDone(state: Pick<PlayerState, "logs" | "items" | "feedback">, itemIndex: number): boolean {
  const item = state.items[itemIndex];
  const fb = state.feedback[itemIndex];
  if (fb?.skipped) return true;
  if (needsFeedback(item)) return Boolean(fb?.difficulty);
  return nextSetNumber(state, itemIndex) === null;
}

/** First unfinished item, or items.length when everything is done (the review screen). */
export function firstOpenItem(state: Pick<PlayerState, "logs" | "items" | "feedback">): number {
  const open = state.items.findIndex((_, i) => !isItemDone(state, i));
  return open === -1 ? state.items.length : open;
}

export type Stage = "set" | "feedback" | "review";

export function stageOf(state: PlayerState): Stage {
  if (state.current >= state.items.length) return "review";
  if (state.editing !== null) return "set";
  const item = state.items[state.current];
  if (nextSetNumber(state, state.current) === null && needsFeedback(item) && !state.feedback[state.current]?.difficulty && !state.feedback[state.current]?.skipped) {
    return "feedback";
  }
  return "set";
}

export function initialState(items: PlayerItem[], logs: PlayerState["logs"], feedback: PlayerState["feedback"]): PlayerState {
  const base = { items, logs, feedback, editing: null, rest: null, paused: false, current: 0 };
  return { ...base, current: firstOpenItem(base) };
}

export function restRemaining(rest: RestState | null, now: number): number {
  if (!rest) return 0;
  return rest.endsAt === null ? rest.remaining : Math.max(0, rest.endsAt - now);
}

function advance(state: PlayerState): PlayerState {
  // Move to the next unfinished item after the current one, wrapping to earlier gaps.
  const after = state.items.findIndex((_, i) => i > state.current && !isItemDone(state, i));
  const next = after !== -1 ? after : firstOpenItem(state);
  return { ...state, current: next, editing: null };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "logged": {
      const logs = { ...state.logs, [action.itemIndex]: { ...(state.logs[action.itemIndex] ?? {}), [action.setNumber]: action.value } };
      let next: PlayerState = { ...state, logs, editing: null };
      if (state.editing !== null) return next;
      const item = state.items[action.itemIndex];
      const remaining = nextSetNumber(next, action.itemIndex);
      if (remaining !== null) {
        if (item.restSeconds > 0) {
          const total = item.restSeconds * 1000;
          next = { ...next, rest: { endsAt: state.paused ? null : action.now + total, remaining: total, total } };
        }
        return next;
      }
      // Last set: main exercises ask for feedback next; others move on.
      return needsFeedback(item) ? { ...next, rest: null } : advance({ ...next, rest: null });
    }
    case "edit":
      return { ...state, editing: action.setNumber };
    case "skipRest":
      return { ...state, rest: null };
    case "addRest": {
      if (!state.rest) return state;
      const add = action.seconds * 1000;
      const remaining = restRemaining(state.rest, action.now) + add;
      return {
        ...state,
        rest: {
          total: state.rest.total + add,
          remaining,
          endsAt: state.rest.endsAt === null ? null : action.now + remaining,
        },
      };
    }
    case "tick":
      if (state.rest && state.rest.endsAt !== null && action.now >= state.rest.endsAt) return { ...state, rest: null };
      return state;
    case "pause":
      if (state.paused) return state;
      return {
        ...state,
        paused: true,
        rest: state.rest ? { ...state.rest, remaining: restRemaining(state.rest, action.now), endsAt: null } : null,
      };
    case "resume":
      if (!state.paused) return state;
      return {
        ...state,
        paused: false,
        rest: state.rest ? { ...state.rest, endsAt: action.now + state.rest.remaining } : null,
      };
    case "feedbackSaved": {
      const next = { ...state, feedback: { ...state.feedback, [action.itemIndex]: action.feedback }, rest: null };
      return action.itemIndex === state.current ? advance(next) : next;
    }
    case "swapped": {
      const items = state.items.map((item) => (item.index === action.itemIndex ? { ...item, exerciseId: action.exerciseId } : item));
      const logs = { ...state.logs };
      delete logs[action.itemIndex];
      const feedback = { ...state.feedback };
      delete feedback[action.itemIndex];
      return { ...state, items, logs, feedback, editing: null, rest: null };
    }
    case "goto":
      return { ...state, current: Math.max(0, Math.min(state.items.length, action.index)), editing: null, rest: null };
    case "restore": {
      if (!action.rest) return { ...state, paused: action.paused };
      const rest = action.paused ? { ...action.rest, endsAt: null } : action.rest;
      if (rest.endsAt !== null && rest.endsAt <= action.now) return { ...state, paused: action.paused, rest: null };
      return { ...state, paused: action.paused, rest };
    }
  }
}

/** Overall progress: sets logged (or skipped) out of all sets. */
export function overallProgress(state: PlayerState): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const item of state.items) {
    total += item.sets;
    done += state.feedback[item.index]?.skipped ? item.sets : Math.min(item.sets, loggedCount(state, item.index));
  }
  return { done, total };
}
