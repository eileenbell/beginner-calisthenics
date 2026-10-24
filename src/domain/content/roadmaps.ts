import type { Goal } from "../types";
import type { SkillId } from "./skills";

// Long-term skills that take more than one 12-week block. FORM trains the
// foundations (phase 1, linked to real pathways). Later phases describe what
// the build-up involves, using coaching conventions from the cited sources
// (docs/research/SOURCES.md). There are no timelines: how long each phase takes
// varies too much from person to person to promise anything.

export type RoadmapId = "freestanding_handstand" | "muscle_up" | "front_lever";

export interface RoadmapStep {
  name: string;
  /** What the step involves, in plain words. */
  involves: string;
}

export interface RoadmapPhase {
  title: string;
  summary: string;
  steps: RoadmapStep[];
  /** A rough sign you're ready to move on. Coaching convention, not a test. */
  benchmark: string;
  /** FORM pathways that train this phase. Empty when FORM doesn't programme it yet. */
  pathways: SkillId[];
}

export interface Roadmap {
  id: RoadmapId;
  goal: Goal;
  name: string;
  summary: string;
  involves: string;
  equipment: string;
  /** Where coaches tend to start the skill itself. Pass marks differ between sources. */
  startingPoint: string;
  phases: RoadmapPhase[];
  safety: string[];
  sources: string[];
}

const SECURE_BAR = "Only use a bar or rings that are securely fixed and rated for your weight.";

export const ROADMAPS: Roadmap[] = [
  {
    id: "freestanding_handstand",
    goal: "skill_handstand",
    name: "Freestanding handstand",
    summary: "Balancing on your hands with no wall, body in one straight line.",
    involves:
      "A handstand is mostly a balance skill built on top of strength. You need wrists that are comfortable taking your full weight, shoulders that push straight up overhead and a braced, straight body. After that it's lots of short, frequent practice. Most people spend far more time on the wall, and on learning to come down safely, than on free balancing.",
    equipment: "A clear, solid wall and open floor space. Nothing else.",
    startingPoint:
      "FORM's handstand pathway unlocks after 5 floor push-ups and a 45-second plank, with no recent wrist or shoulder discomfort. Coaching guides commonly suggest a chest-to-wall hold of 20 to 30 seconds, over several sets, before working on balance away from the wall.",
    phases: [
      {
        title: "Build the base",
        summary: "Pushing strength, a strong plank and a comfortable wall handstand.",
        pathways: ["push_up_mastery", "core_hollow", "handstand_prep"],
        steps: [
          { name: "Floor push-ups and planks", involves: "Five floor push-ups and a 45-second plank unlock FORM's handstand pathway." },
          { name: "Elevated pike holds and pike push-ups", involves: "Feet on a step, hips high, pushing tall through straight arms. Gets your wrists and shoulders used to weight overhead." },
          { name: "Partial wall walks", involves: "Walking your feet up the wall and your hands closer to it, only as far as you can comfortably come back from." },
          { name: "Chest-to-wall holds", involves: "Facing the wall with straight arms and a straight body, building up to 30 seconds." },
        ],
        benchmark: "A 30-second chest-to-wall hold with straight arms and no banana-shaped back.",
      },
      {
        title: "Learn to come down safely",
        summary: "Before you balance away from the wall, learn to get out of a handstand on purpose.",
        pathways: [],
        steps: [
          { name: "Cartwheel bail", involves: "From a low kick-up, turn your hips and step one hand across so you land on your feet to the side, like a cartwheel. Practise both directions." },
          { name: "Gentle kick-ups", involves: "Kick up lightly with one leg and step back down, so being upside down without a wall becomes familiar." },
        ],
        benchmark: "You can bail out to either side without thinking about it.",
      },
      {
        title: "Find your balance on the wall",
        summary: "Small, controlled moments away from the wall.",
        pathways: [],
        steps: [
          { name: "Heel pulls", involves: "In a back-to-wall handstand, press your fingertips into the floor to shift your weight over your hands until your heels leave the wall, then come back." },
          { name: "Toe pulls", involves: "In a chest-to-wall handstand, ease your toes off the wall to find balance. You'll probably go too far at first, so be ready to bail." },
        ],
        benchmark: "A few seconds off the wall and back under control, many times in a row.",
      },
      {
        title: "Freestanding",
        summary: "Short balances in open space that gradually get longer.",
        pathways: [],
        steps: [
          { name: "Kick up to balance", involves: "Kick up gently in open space and try to stop in balance. Kicking too hard sends you over." },
          { name: "Lengthen your holds", involves: "Short, frequent attempts. Come down while your line is still clean rather than holding on until you're tired." },
        ],
        benchmark: "Balances you can repeat, rather than one lucky hold.",
      },
    ],
    safety: [
      "Practise on a clear floor with nothing behind you or to the sides.",
      "Learn to bail before you work on balance away from the wall.",
      "Warm up your wrists every time, and stop if your wrists or shoulders hurt.",
      "Not suitable for people advised to avoid being upside down, for example with uncontrolled blood pressure or some eye conditions. Check with a health professional if unsure.",
    ],
    sources: ["S21"],
  },
  {
    id: "muscle_up",
    goal: "skill_muscle_up",
    name: "Muscle-up",
    summary: "Pulling yourself from a hang to above the bar or rings, then pressing to straight arms.",
    involves:
      "A muscle-up joins three things: a strong, high pull-up, a deep dip, and a quick change from pulling to pushing as your chest passes the bar. It needs solid pulling and dipping strength first. On rings, most people also learn a false grip, with the wrist over the ring, so they don't have to change grip halfway.",
    equipment: "A pull-up bar or rings, plus parallel bars or a dip station for the dip work.",
    startingPoint:
      "Coaches' pass marks vary a lot, from about 5 strict chest-to-bar pull-ups and 5 deep dips up to 10 or 15 of each. One source that suggests 15 of each calls it a guideline rather than a requirement.",
    phases: [
      {
        title: "Build the base",
        summary: "Your first pull-ups and controlled work on parallel bars.",
        pathways: ["first_pull_up", "dip_prep"],
        steps: [
          { name: "Hangs, shoulder-blade pulls and negatives", involves: "FORM's first pull-up pathway, through to 3 pull-ups in a set." },
          { name: "Support holds and slow negative dips", involves: "FORM's dip preparation pathway on parallel bars." },
        ],
        benchmark: "3 pull-ups in a set and 3 slow negative dips.",
      },
      {
        title: "Build pulling and dipping volume",
        summary: "More strict pull-ups and full-range dips.",
        pathways: [],
        steps: [
          { name: "More pull-ups", involves: "Building bigger sets of strict pull-ups, then pulling higher until your chest touches the bar." },
          { name: "Full dips", involves: "Lowering further than FORM's partial negatives and pressing back up, keeping your shoulders comfortable." },
        ],
        benchmark: "Somewhere in the range above, for example 5 or more strict chest-to-bar pull-ups and 5 or more deep dips.",
      },
      {
        title: "Pull higher and faster",
        summary: "Getting your chest well above the bar.",
        pathways: [],
        steps: [
          { name: "Explosive pull-ups", involves: "Pulling as fast as you can so your chest clears the bar, not just your chin." },
          { name: "False grip work (rings)", involves: "Hangs, rows and pull-ups with your wrist over the ring. Optional on a bar, but it helps." },
        ],
        benchmark: "Pull-ups where your chest clearly passes the bar.",
      },
      {
        title: "Learn the transition",
        summary: "Practising the moment you switch from pulling to pushing.",
        pathways: [],
        steps: [
          { name: "Transition negatives", involves: "Start in a support above the bar and lower slowly through the transition into a hang." },
          { name: "First attempts", involves: "On a bar, it's fine to let your chest rest on the bar during the transition at first." },
        ],
        benchmark: "A muscle-up without a big swing or kick.",
      },
    ],
    safety: [
      "Tendons and other connective tissue adapt more slowly than muscle. Don't rush to the full movement before your elbows and shoulders are ready.",
      "Stop if you feel pain at the front of the shoulder or in the elbow.",
      SECURE_BAR,
    ],
    sources: ["S22"],
  },
  {
    id: "front_lever",
    goal: "skill_front_lever",
    name: "Front lever",
    summary: "Hanging from a bar with straight arms and your body held level, face up.",
    involves:
      "The front lever is a straight-arm pulling hold. Your lats, shoulders and core keep your body level while you hang from your hands. It's built through a series of shorter-lever holds, starting with your knees tucked in and gradually straightening your body.",
    equipment: "A pull-up bar or rings.",
    startingPoint:
      "One guide suggests about 10 strict pull-ups and a 30-second active hang (shoulders pulled down, arms straight) before starting tuck holds. Other sources set different marks.",
    phases: [
      {
        title: "Build the base",
        summary: "Grip, hanging strength, first pull-ups and the hollow body position.",
        pathways: ["first_pull_up", "core_hollow"],
        steps: [
          { name: "Hangs and pull-ups", involves: "FORM's first pull-up pathway, from 20- and 30-second hangs through to 3 pull-ups in a set." },
          { name: "Hollow body hold", involves: "The same braced, straight body you'll hold in a lever, practised on the floor." },
        ],
        benchmark: "3 pull-ups in a set and a 20-second hollow hold.",
      },
      {
        title: "Tuck front lever",
        summary: "The shortest lever, with your knees pulled in to your chest.",
        pathways: [],
        steps: [
          { name: "Active hangs", involves: "Hanging with your shoulders pulled down and back and your arms straight." },
          { name: "Tuck front lever", involves: "Pull your knees to your chest and lift your hips until your back is roughly level with the floor, arms straight." },
        ],
        benchmark: "Steady tuck holds with straight arms and a level back.",
      },
      {
        title: "Advanced tuck",
        summary: "Opening your hips so your back is flat.",
        pathways: [],
        steps: [
          { name: "Advanced tuck front lever", involves: "Open your hips until your back is flat and level, with your knees still bent at about 90 degrees." },
        ],
        benchmark: "One guide suggests about 10 seconds with a flat back before moving on.",
      },
      {
        title: "Longer levers",
        summary: "Gradually straightening your body.",
        pathways: [],
        steps: [
          { name: "One-leg front lever", involves: "From the advanced tuck, slowly straighten one leg while the other stays tucked." },
          { name: "Straddle front lever", involves: "Both legs straight and spread apart, body level." },
          { name: "Full front lever", involves: "Legs straight and together, body in one level line." },
        ],
        benchmark: "A held full front lever without arching your lower back.",
      },
    ],
    safety: [
      "Straight-arm pulling puts a lot of load through the elbows and the front of the shoulders. Build up slowly and stop if your elbows ache.",
      "Don't let your lower back arch to make up for missing strength.",
      SECURE_BAR,
    ],
    sources: ["S23"],
  },
];

export const ROADMAPS_BY_ID: ReadonlyMap<RoadmapId, Roadmap> = new Map(ROADMAPS.map((r) => [r.id, r]));

export function roadmapForGoal(goal: Goal): Roadmap | null {
  return ROADMAPS.find((r) => r.goal === goal) ?? null;
}

/** Other skills people often aim for. Listed so people know they exist; FORM doesn't cover them yet. */
export const LATER_SKILLS: { name: string; involves: string }[] = [
  { name: "Planche", involves: "Holding your body level above the floor on straight arms, leaning forward over your hands. A very advanced pushing skill." },
  { name: "Back lever", involves: "Hanging face down with your body level under a bar or rings. It puts a big stretch on the shoulders and elbows." },
  { name: "Human flag", involves: "Holding your body out sideways from a vertical pole. Needs very strong shoulders, lats and obliques." },
  { name: "One-arm push-up", involves: "A full push-up on one hand, with your feet wide for balance." },
];
