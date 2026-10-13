// Training sessions: powerlifting-focused full body, 3 days a week (Fri squat, Sat bench, Tue deadlift).
// The first three weeks are a learning phase (light weights, form first).

export interface ExerciseDef {
  id: string;
  name: string;
  muscles: string;
  sets: number;
  reps?: [number, number];
  timed?: boolean;
  secs?: [number, number];
  rest: number;
  lower: boolean;
  perSide?: boolean;
  cue: string;
  alt: string[];
  /** Bodyweight exercise with no load field. */
  bodyweight?: boolean;
  /** Load added after a clean session where every prescribed rep was hit (kg). */
  inc: number;
  /** Light day: weight follows a heavy lift (percent of that lift's current working weight). */
  lightOf?: { id: string; pct: number };
}

export type SessionKey = 'SQUAT' | 'BENCH' | 'DEADLIFT' | 'MINIMUM';

export interface SessionDef {
  name: string;
  /** Short label for chips and day cards. */
  short: string;
  minutes: number;
  exercises: ExerciseDef[];
}

const SQUAT_DAY: ExerciseDef[] = [
  { id: 'squat', name: 'Squat', muscles: 'Quads, glutes, back', sets: 4, reps: [5, 5], rest: 180, lower: true, inc: 5,
    cue: 'Brace your belly, sit between your hips, knees follow your toes, drive up through the middle of your foot. Use the safety bars.',
    alt: ['Smith machine squat', 'Leg press', 'Goblet box squat'] },
  { id: 'rdl', name: 'Romanian deadlift', muscles: 'Hamstrings, glutes', sets: 3, reps: [8, 8], rest: 120, lower: true, inc: 5,
    cue: 'Soft knees, hips back, bar slides down your thighs, stop at mid-shin with a flat back.',
    alt: ['Dumbbell Romanian deadlift', 'Cable pull-through'] },
  { id: 'leg_press', name: 'Leg press', muscles: 'Quads, glutes', sets: 2, reps: [10, 10], rest: 90, lower: true, inc: 5,
    cue: 'Feet shoulder-width, lower to about 90 degrees of knee bend, do not lock the knees hard.',
    alt: ['Goblet box squat', 'Smith machine squat'] },
  { id: 'plank', name: 'Plank', muscles: 'Core', sets: 3, timed: true, secs: [30, 60], rest: 45, lower: false, bodyweight: true, inc: 0,
    cue: 'Ribs down, squeeze glutes, straight line from head to heels.',
    alt: ['Incline plank on a bench', 'Dead bug'] },
];

const BENCH_DAY: ExerciseDef[] = [
  { id: 'bench', name: 'Bench press', muscles: 'Chest, triceps, front shoulder', sets: 4, reps: [5, 5], rest: 180, lower: false, inc: 2.5,
    cue: 'Shoulder blades pinched back and down, feet planted, elbows about 45 degrees, touch the chest, press up. Use a spotter or safeties.',
    alt: ['Dumbbell bench press', 'Machine chest press'] },
  { id: 'ohp', name: 'Overhead press', muscles: 'Shoulders, triceps', sets: 3, reps: [6, 8], rest: 120, lower: false, inc: 2.5,
    cue: 'Squeeze glutes and belly, bar starts at the collarbone, press straight up and move your head through. Stop if the right shoulder pinches.',
    alt: ['Seated dumbbell shoulder press', 'Machine shoulder press'] },
  { id: 'barbell_row', name: 'Barbell row', muscles: 'Back, biceps', sets: 3, reps: [8, 8], rest: 90, lower: false, inc: 2.5,
    cue: 'Hinge to about 45 degrees, flat back, pull the bar to your lower ribs, no body swing.',
    alt: ['Chest-supported machine row', 'Seated cable row', 'One-arm dumbbell row'] },
  { id: 'biceps_curl', name: 'Biceps curl', muscles: 'Biceps', sets: 2, reps: [10, 12], rest: 60, lower: false, inc: 2.5,
    cue: 'Elbows by your sides, no swinging. Superset with the triceps pushdown.',
    alt: ['Cable curl', 'Hammer curl', 'Machine curl'] },
  { id: 'triceps_pushdown', name: 'Triceps pushdown', muscles: 'Triceps', sets: 2, reps: [10, 12], rest: 60, lower: false, inc: 2.5,
    cue: 'Elbows pinned to your sides. Superset with the biceps curl.',
    alt: ['Rope triceps pushdown', 'Machine triceps press', 'Bench dips are NOT allowed; use band pushdown'] },
];

const DEADLIFT_DAY: ExerciseDef[] = [
  { id: 'deadlift', name: 'Deadlift', muscles: 'Back, glutes, hamstrings', sets: 3, reps: [5, 5], rest: 180, lower: true, inc: 5,
    cue: 'Bar over mid-foot, brace, pull the slack out, push the floor away, lock out with your glutes. Reset every rep.',
    alt: ['Trap bar deadlift', 'Romanian deadlift'] },
  { id: 'light_squat', name: 'Light squat', muscles: 'Quads, glutes', sets: 2, reps: [5, 5], rest: 90, lower: true, inc: 0, lightOf: { id: 'squat', pct: 0.75 },
    cue: 'About 75% of Friday’s squat weight. Fast and smooth, perfect form.',
    alt: ['Leg press', 'Goblet box squat'] },
  { id: 'light_bench', name: 'Light bench', muscles: 'Chest, triceps', sets: 3, reps: [5, 5], rest: 90, lower: false, inc: 0, lightOf: { id: 'bench', pct: 0.75 },
    cue: 'About 75% of Saturday’s bench weight. Pause on the chest, crisp reps.',
    alt: ['Machine chest press', 'Dumbbell bench press'] },
  { id: 'lat_pulldown', name: 'Lat pulldown', muscles: 'Lats, biceps', sets: 3, reps: [8, 10], rest: 90, lower: false, inc: 2.5,
    cue: 'Pull elbows down toward your ribs to the upper chest. Never behind the neck.',
    alt: ['Assisted pull-up machine', 'Seated cable row'] },
];

function pick(list: ExerciseDef[], id: string): ExerciseDef {
  const e = list.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown exercise ${id}`);
  return e;
}

// Minimum version (30 min) for tired days: machines and low-skill moves, 2 sets each.
const MINIMUM: ExerciseDef[] = [
  { ...pick(SQUAT_DAY, 'leg_press'), sets: 2 },
  { ...pick(DEADLIFT_DAY, 'lat_pulldown'), sets: 2, reps: [10, 10] },
  { ...pick(SQUAT_DAY, 'plank'), sets: 2, secs: [30, 30] },
];

export const SESSIONS: Record<SessionKey, SessionDef> = {
  SQUAT: { name: 'Squat day', short: 'Squat', minutes: 70, exercises: SQUAT_DAY },
  BENCH: { name: 'Bench day', short: 'Bench', minutes: 70, exercises: BENCH_DAY },
  DEADLIFT: { name: 'Deadlift day', short: 'Deadlift', minutes: 60, exercises: DEADLIFT_DAY },
  MINIMUM: { name: 'Minimum version (30 min)', short: 'Minimum', minutes: 30, exercises: MINIMUM },
};

export const LIFT_SESSIONS: SessionKey[] = ['SQUAT', 'BENCH', 'DEADLIFT'];
/** Heavy leg sessions: never on consecutive days. */
export const LOWER_SESSIONS: SessionKey[] = ['SQUAT', 'DEADLIFT'];

export const ALL_EXERCISES: ExerciseDef[] = [...SQUAT_DAY, ...BENCH_DAY, ...DEADLIFT_DAY];

/** Turns an alt label like "Bench dips are NOT allowed; use band pushdown" into a usable name. */
export function altDisplayName(alt: string): string {
  const m = alt.match(/NOT allowed; use (.+)$/i);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return alt;
}

export function findExercise(id: string): ExerciseDef | undefined {
  return ALL_EXERCISES.find((e) => e.id === id);
}

// Optional opt-in after week 6, only if pain-free.
export const LEG_EXTENSION_OPTIN: ExerciseDef = {
  id: 'leg_extension_light', name: 'Leg extension (light, 90 to 45 degrees only)', muscles: 'Quads', sets: 2, reps: [12, 12], rest: 60, lower: true, inc: 2.5,
  cue: 'Light weight. Only move between 90 and 45 degrees of knee bend. Stop if the knee complains.', alt: ['Leg press', 'Goblet box squat'],
};

export const WARMUP = [
  '5 min easy bike or walk',
  'Arm circles and band pull-aparts x15',
  '10 glute bridges, 10 bodyweight hip hinges',
  'First lift: empty bar x10, then ~50% x5, ~70% x3, ~85% x1-2',
  'Later exercises: one light set of 6-8',
];

export const MOBILITY = [
  'Thoracic extension over foam roller x10',
  'Hip flexor stretch 30 s per side',
  'Calf stretch 30 s per side',
  'Gentle doorway pec stretch 30 s',
];

export const COOLDOWN = '3-5 min easy walk';

export const WALK_FALLBACK = [
  '20-30 minute walk',
  '10 sit-to-stand squats',
  '10 incline push-ups on the sofa edge',
];

export const CARDIO_TYPES = ['Incline walk', 'Bike', 'Elliptical'] as const;

// Main lifts for the lifts-over-time chart.
export const MAIN_LIFTS: { key: string; name: string; ids: string[] }[] = [
  { key: 'squat', name: 'Squat', ids: ['squat'] },
  { key: 'bench', name: 'Bench press', ids: ['bench'] },
  { key: 'deadlift', name: 'Deadlift', ids: ['deadlift'] },
  { key: 'ohp', name: 'Overhead press', ids: ['ohp'] },
  { key: 'row', name: 'Barbell row', ids: ['barbell_row'] },
];
