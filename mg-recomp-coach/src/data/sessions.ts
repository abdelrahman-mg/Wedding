// Training sessions. Joint-safe by design (right shoulder instability, right knee ACL repair).
// Leg extensions are intentionally excluded.

export interface ExerciseDef {
  id: string;
  name: string;
  muscles: string;
  sets: number;
  reps?: [number, number];
  timed?: boolean;
  secs?: [number, number];
  rest: number;
  rir: string;
  lower: boolean;
  perSide?: boolean;
  cue: string;
  alt: string[];
  /** Bodyweight exercise with no load field. */
  bodyweight?: boolean;
}

export type SessionKey = 'UPPER_A' | 'LOWER_A' | 'UPPER_B' | 'LOWER_B' | 'MINIMUM';

export interface SessionDef {
  name: string;
  minutes: number;
  exercises: ExerciseDef[];
}

const UPPER_A: ExerciseDef[] = [
  { id: 'chest_press_machine', name: 'Machine chest press (neutral grip)', muscles: 'Chest, triceps', sets: 3, reps: [8, 12], rest: 90, rir: '2-3', lower: false,
    cue: 'Shoulder blades back and down, elbows about 45 degrees from your body, do not go deep.', alt: ['Incline push-up on a bench', 'Dumbbell chest press (light, neutral grip)'] },
  { id: 'seated_cable_row', name: 'Seated cable row (neutral grip)', muscles: 'Back, biceps', sets: 3, reps: [10, 12], rest: 90, rir: '2-3', lower: false,
    cue: 'Chest tall, pull elbows back, pause 1 s.', alt: ['Chest-supported machine row', 'One-arm dumbbell row on a bench'] },
  { id: 'lat_pulldown_neutral', name: 'Lat pulldown (neutral or close grip, to upper chest)', muscles: 'Lats', sets: 3, reps: [10, 12], rest: 90, rir: '2-3', lower: false,
    cue: 'Pull elbows down. Never behind the neck.', alt: ['Assisted pull-up machine', 'Straight-arm cable pulldown (light)'] },
  { id: 'face_pull', name: 'Cable face pull', muscles: 'Rear shoulder, rotator cuff', sets: 3, reps: [12, 15], rest: 60, rir: '3', lower: false,
    cue: 'Rope to forehead height, elbows high, light weight.', alt: ['Band pull-apart', 'Reverse pec-deck (light)'] },
  { id: 'triceps_pushdown', name: 'Cable triceps pushdown', muscles: 'Triceps', sets: 2, reps: [10, 15], rest: 60, rir: '2', lower: false,
    cue: 'Elbows pinned to your sides.', alt: ['Machine triceps press', 'Bench dips are NOT allowed; use band pushdown'] },
  { id: 'db_curl', name: 'Dumbbell biceps curl', muscles: 'Biceps', sets: 2, reps: [10, 12], rest: 60, rir: '2', lower: false,
    cue: 'No swinging, full control.', alt: ['Cable curl', 'Machine curl'] },
  { id: 'plank', name: 'Plank', muscles: 'Core', sets: 3, timed: true, secs: [20, 40], rest: 45, rir: '-', lower: false, bodyweight: true,
    cue: 'Ribs down, squeeze glutes.', alt: ['Incline plank on a bench', 'Dead bug'] },
];

const LOWER_A: ExerciseDef[] = [
  { id: 'leg_press', name: 'Leg press (feet shoulder-width, mid platform)', muscles: 'Quads, glutes', sets: 3, reps: [10, 12], rest: 120, rir: '2-3', lower: true,
    cue: 'Lower to about 90 degrees of knee bend, do not lock out hard, knees track over toes.', alt: ['Goblet box squat to a bench', 'Smith machine box squat (pain-free range)'] },
  { id: 'db_rdl', name: 'Dumbbell Romanian deadlift', muscles: 'Hamstrings, glutes', sets: 3, reps: [8, 12], rest: 105, rir: '2-3', lower: true,
    cue: 'Hips back, flat back, dumbbells close to legs, stop at mid-shin.', alt: ['Cable pull-through', 'Back extension machine (light)'] },
  { id: 'hip_thrust', name: 'Hip thrust (machine or bench)', muscles: 'Glutes', sets: 3, reps: [10, 12], rest: 90, rir: '2', lower: true,
    cue: 'Chin tucked, squeeze at the top for 1 s.', alt: ['Glute bridge on the floor', 'Cable kickback'] },
  { id: 'leg_curl', name: 'Seated or lying leg curl', muscles: 'Hamstrings', sets: 3, reps: [10, 12], rest: 90, rir: '2-3', lower: true,
    cue: 'Start light, 3 s lowering. Some tightness is normal if the graft used the hamstring.', alt: ['Cable standing leg curl', 'Stability-ball leg curl'] },
  { id: 'calf_raise', name: 'Standing or seated calf raise', muscles: 'Calves', sets: 3, reps: [12, 15], rest: 60, rir: '2', lower: true,
    cue: 'Full stretch, pause at the top.', alt: ['Calf raise on the leg press', 'Single-leg calf raise on a step'] },
  { id: 'dead_bug', name: 'Dead bug (reps per side)', muscles: 'Core', sets: 3, reps: [8, 8], rest: 45, rir: '-', lower: false, perSide: true, bodyweight: true,
    cue: 'Lower back stays on the floor.', alt: ['Bird-dog', 'Plank'] },
];

const UPPER_B: ExerciseDef[] = [
  { id: 'incline_press_machine', name: 'Incline chest press machine (neutral grip)', muscles: 'Upper chest, triceps', sets: 3, reps: [8, 12], rest: 90, rir: '2-3', lower: false,
    cue: 'Same shoulder setup as Upper A.', alt: ['Machine chest press', 'Incline push-up'] },
  { id: 'chest_supported_row', name: 'Chest-supported machine row', muscles: 'Back', sets: 3, reps: [10, 12], rest: 90, rir: '2-3', lower: false,
    cue: 'Chest on the pad, squeeze shoulder blades.', alt: ['Seated cable row', 'One-arm dumbbell row'] },
  { id: 'assisted_pullup', name: 'Assisted pull-up (neutral handles)', muscles: 'Lats, biceps', sets: 3, reps: [6, 10], rest: 90, rir: '2', lower: false,
    cue: 'Use enough assistance for clean reps; reduce the assistance as you progress.', alt: ['Lat pulldown (neutral grip)', 'Seated cable row'] },
  { id: 'lateral_raise', name: 'Dumbbell lateral raise (light)', muscles: 'Side shoulder', sets: 3, reps: [12, 15], rest: 60, rir: '2-3', lower: false,
    cue: 'Slight forward lean, thumbs forward, stop at shoulder height.', alt: ['Cable lateral raise', 'Machine lateral raise'] },
  { id: 'external_rotation', name: 'Band or cable external rotation (per side)', muscles: 'Rotator cuff', sets: 2, reps: [15, 15], rest: 45, rir: '3', lower: false, perSide: true,
    cue: 'Elbow at the waist, slow rotations, light.', alt: ['Face pull', 'Band pull-apart'] },
  { id: 'rope_pushdown', name: 'Rope triceps pushdown', muscles: 'Triceps', sets: 2, reps: [12, 15], rest: 60, rir: '2', lower: false,
    cue: 'Elbows pinned.', alt: ['Machine triceps press', 'Band pushdown'] },
  { id: 'hammer_curl', name: 'Hammer curl', muscles: 'Biceps, forearms', sets: 2, reps: [10, 12], rest: 60, rir: '2', lower: false,
    cue: 'Neutral grip, no swinging.', alt: ['Cable rope curl', 'Machine curl'] },
  { id: 'pallof_press', name: 'Pallof press (per side)', muscles: 'Core', sets: 3, reps: [10, 10], rest: 45, rir: '-', lower: false, perSide: true,
    cue: 'Resist the twist, tall posture.', alt: ['Plank', 'Dead bug'] },
];

const LOWER_B: ExerciseDef[] = [
  { id: 'goblet_box_squat', name: 'Goblet box squat (to bench height)', muscles: 'Quads, glutes', sets: 3, reps: [8, 12], rest: 120, rir: '2-3', lower: true,
    cue: 'Hold one dumbbell at your chest, sit back and down, drive through the heels.', alt: ['Leg press', 'Smith machine box squat'] },
  { id: 'cable_pull_through', name: 'Cable pull-through', muscles: 'Glutes, hamstrings', sets: 3, reps: [10, 12], rest: 90, rir: '2-3', lower: true,
    cue: 'Hinge at the hips, flat back.', alt: ['Dumbbell Romanian deadlift', 'Back extension machine'] },
  { id: 'hip_thrust_b', name: 'Hip thrust', muscles: 'Glutes', sets: 3, reps: [8, 12], rest: 90, rir: '2', lower: true,
    cue: 'Slightly heavier than Lower A.', alt: ['Glute bridge', 'Cable kickback'] },
  { id: 'seated_leg_curl', name: 'Seated leg curl', muscles: 'Hamstrings', sets: 3, reps: [10, 12], rest: 90, rir: '2-3', lower: true,
    cue: 'Slow lowering.', alt: ['Lying leg curl', 'Cable standing leg curl'] },
  { id: 'hip_abduction', name: 'Hip abduction machine', muscles: 'Outer glutes', sets: 2, reps: [12, 15], rest: 60, rir: '2', lower: true,
    cue: 'Control the return.', alt: ['Band side steps', 'Cable hip abduction'] },
  { id: 'calf_raise_b', name: 'Calf raise', muscles: 'Calves', sets: 3, reps: [12, 15], rest: 60, rir: '2', lower: true,
    cue: 'Full range.', alt: ['Leg press calf raise', 'Single-leg calf raise'] },
  { id: 'side_plank', name: 'Side plank (seconds per side)', muscles: 'Core', sets: 3, timed: true, secs: [20, 30], rest: 45, rir: '-', lower: false, perSide: true, bodyweight: true,
    cue: 'Straight line, hips up.', alt: ['Bird-dog', 'Plank'] },
];

function pick(list: ExerciseDef[], id: string): ExerciseDef {
  const e = list.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown exercise ${id}`);
  return e;
}

// Minimum version (30 min): reuse definitions with sets overridden to 2.
const MINIMUM: ExerciseDef[] = [
  { ...pick(LOWER_A, 'leg_press'), sets: 2, reps: [10, 10] },
  { ...pick(UPPER_A, 'chest_press_machine'), sets: 2, reps: [10, 10] },
  { ...pick(UPPER_A, 'seated_cable_row'), sets: 2, reps: [10, 10] },
  { ...pick(UPPER_A, 'plank'), sets: 2, secs: [30, 30] },
];

export const SESSIONS: Record<SessionKey, SessionDef> = {
  UPPER_A: { name: 'Upper A', minutes: 60, exercises: UPPER_A },
  LOWER_A: { name: 'Lower A', minutes: 60, exercises: LOWER_A },
  UPPER_B: { name: 'Upper B', minutes: 65, exercises: UPPER_B },
  LOWER_B: { name: 'Lower B', minutes: 65, exercises: LOWER_B },
  MINIMUM: { name: 'Minimum version (30 min)', minutes: 30, exercises: MINIMUM },
};

export const LIFT_SESSIONS: SessionKey[] = ['UPPER_A', 'LOWER_A', 'UPPER_B', 'LOWER_B'];
export const LOWER_SESSIONS: SessionKey[] = ['LOWER_A', 'LOWER_B'];

export const ALL_EXERCISES: ExerciseDef[] = [...UPPER_A, ...LOWER_A, ...UPPER_B, ...LOWER_B];

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
  id: 'leg_extension_light', name: 'Leg extension (light, 90 to 45 degrees only)', muscles: 'Quads', sets: 2, reps: [12, 12], rest: 60, rir: '3', lower: true,
  cue: 'Light weight. Only move between 90 and 45 degrees of knee bend. Stop if the knee complains.', alt: ['Leg press', 'Goblet box squat'],
};

export const WARMUP = [
  '5 min easy bike or walk',
  'Arm circles',
  'Band pull-aparts x15',
  '10 glute bridges',
  '10 bodyweight hip hinges',
  '10 shoulder blade squeezes',
  'First exercise: ramp-up ~50% x 8, then ~70% x 4-5',
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

// Main lifts for the strength trend (section 6.6).
export const MAIN_LIFTS: { key: string; name: string; ids: string[] }[] = [
  { key: 'chest', name: 'Chest press', ids: ['chest_press_machine'] },
  { key: 'row', name: 'Seated row', ids: ['seated_cable_row'] },
  { key: 'legpress', name: 'Leg press', ids: ['leg_press'] },
  { key: 'hipthrust', name: 'Hip thrust', ids: ['hip_thrust', 'hip_thrust_b'] },
  { key: 'pulldown', name: 'Lat pulldown', ids: ['lat_pulldown_neutral'] },
];
