import { findExercise, SESSIONS } from '../src/data/sessions';
import { FIRST_TIME_MESSAGE, hitAll, isPR, suggestLight, suggestProgression, type ExerciseSession } from '../src/engine/progression';

const squat = findExercise('squat')!; // lower, 4x5, +5
const bench = findExercise('bench')!; // upper, 4x5, +2.5
const ohp = findExercise('ohp')!; // 3x6-8, +2.5
const deadlift = findExercise('deadlift')!; // 3x5, +5
const lightSquat = findExercise('light_squat')!;
const plank = findExercise('plank')!; // timed 30-60

type S = [number | null, number, boolean?];
const sess = (date: string, sets: S[], deload = false): ExerciseSession => ({
  date,
  deload,
  sets: sets.map(([weight, reps, clean]) => ({ weight, reps, clean: clean ?? true })),
});
const four = (w: number, reps = 5): S[] => [[w, reps], [w, reps], [w, reps], [w, reps]];

describe('progression', () => {
  test('first time ever: no prefill, start light', () => {
    const s = suggestProgression(bench, []);
    expect(s.kind).toBe('first');
    expect(s.weight).toBeNull();
    expect(s.message).toBe(FIRST_TIME_MESSAGE);
  });

  test('bench: all reps hit with clean form adds 2.5 kg', () => {
    const s = suggestProgression(bench, [sess('2026-10-01', four(60))]);
    expect(s.kind).toBe('addLoad');
    expect(s.weight).toBe(62.5);
    expect(s.targetReps).toBe(5);
  });

  test('overhead press adds 2.5 kg only at the top of 6-8', () => {
    const top = suggestProgression(ohp, [sess('2026-10-01', [[30, 8], [30, 8], [30, 8]])]);
    expect(top.kind).toBe('addLoad');
    expect(top.weight).toBe(32.5);
    const mid = suggestProgression(ohp, [sess('2026-10-01', [[30, 8], [30, 7], [30, 6]])]);
    expect(mid.kind).toBe('addRep');
    expect(mid.weight).toBe(30);
  });

  test('squat and deadlift add 5 kg', () => {
    expect(suggestProgression(squat, [sess('2026-10-01', four(80))]).weight).toBe(85);
    expect(suggestProgression(deadlift, [sess('2026-10-01', [[100, 5], [100, 5], [100, 5]])]).weight).toBe(105);
  });

  test('form that was not clean blocks the increase', () => {
    const s = suggestProgression(bench, [sess('2026-10-01', [[60, 5], [60, 5], [60, 5, false], [60, 5]])]);
    expect(s.kind).not.toBe('addLoad');
    expect(s.weight).toBe(60);
    expect(s.message).toMatch(/Form slipped/);
  });

  test('missing a set blocks the increase', () => {
    const s = suggestProgression(bench, [sess('2026-10-01', [[60, 5], [60, 5], [60, 5]])]);
    expect(hitAll(bench, sess('2026-10-01', [[60, 5], [60, 5], [60, 5]]))).toBe(false);
    expect(s.kind).not.toBe('addLoad');
  });

  test('one missed session repeats the weight', () => {
    const s = suggestProgression(squat, [sess('2026-10-01', four(80)), sess('2026-10-04', [[85, 5], [85, 5], [85, 4], [85, 4]])]);
    expect(s.kind).toBe('hold');
    expect(s.weight).toBe(85);
  });

  test('failing to progress twice in a row suggests a 10% deload', () => {
    const s = suggestProgression(squat, [
      sess('2026-10-01', four(80)),
      sess('2026-10-04', [[85, 5], [85, 5], [85, 4], [85, 3]]),
      sess('2026-10-08', [[85, 5], [85, 4], [85, 4], [85, 3]]),
    ]);
    expect(s.kind).toBe('deload');
    expect(s.weight).toBe(77.5); // 85 * 0.9 = 76.5 rounded to 2.5
    expect(s.message).toMatch(/10% deload/);
  });

  test('after a deload session that hits every rep, load goes up again', () => {
    const s = suggestProgression(squat, [
      sess('2026-10-04', [[85, 5], [85, 5], [85, 4], [85, 3]]),
      sess('2026-10-08', [[85, 5], [85, 4], [85, 4], [85, 3]]),
      sess('2026-10-11', four(77.5)),
    ]);
    expect(s.kind).toBe('addLoad');
    expect(s.weight).toBe(82.5);
  });

  test('sessions with fewer than min(2, sets) logged sets are ignored', () => {
    expect(suggestProgression(bench, [sess('2026-10-01', [[40, 5]])]).kind).toBe('first');
  });

  test('timed: +5 s until top, then add a set (max 4)', () => {
    const a = suggestProgression(plank, [sess('2026-10-01', [[null, 35], [null, 30]])]);
    expect(a.kind).toBe('addTime');
    expect(a.targetReps).toBe(35);
    const b = suggestProgression(plank, [sess('2026-10-01', [[null, 60], [null, 60], [null, 60]])]);
    expect(b.kind).toBe('addSet');
    expect(b.sets).toBe(4);
  });

  test('light day follows a percentage of the heavy lift', () => {
    const s = suggestLight(lightSquat, [sess('2026-10-01', four(100))], 'Squat');
    expect(s.kind).toBe('light');
    expect(s.weight).toBe(75);
    expect(suggestLight(lightSquat, [], 'Squat').kind).toBe('first');
  });

  test('stall: no progress in 3 consecutive sessions', () => {
    const h = [
      sess('2026-09-01', [[60, 5], [60, 5]]),
      sess('2026-09-04', [[60, 5], [60, 4]]),
      sess('2026-09-08', [[60, 5], [60, 5]]),
      sess('2026-09-11', [[60, 4], [60, 4]]),
    ];
    const s = suggestProgression(bench, h);
    expect(s.stall).toBe(true);
    expect(s.stallMessage).toMatch(/sleep, protein and calories/);
  });

  test('deload sessions are not used as the reference', () => {
    const s = suggestProgression(bench, [sess('2026-10-01', four(60)), sess('2026-10-08', [[55, 5], [55, 5]], true)]);
    expect(s.kind).toBe('addLoad');
    expect(s.weight).toBe(62.5);
  });

  test('personal records', () => {
    const prev = [sess('2026-10-01', [[40, 10]])];
    expect(isPR(sess('2026-10-04', [[42.5, 8]]), prev)).toBe(true);
    expect(isPR(sess('2026-10-04', [[40, 11]]), prev)).toBe(true);
    expect(isPR(sess('2026-10-04', [[40, 10]]), prev)).toBe(false);
    expect(isPR(sess('2026-10-04', [[40, 10]]), [])).toBe(false);
  });
});

describe('the program', () => {
  test('three sessions with the requested exercises', () => {
    const ids = (k: 'SQUAT' | 'BENCH' | 'DEADLIFT') => SESSIONS[k].exercises.map((e) => `${e.id} ${e.sets}`);
    expect(ids('SQUAT')).toEqual(['squat 4', 'rdl 3', 'leg_press 2', 'plank 3']);
    expect(ids('BENCH')).toEqual(['bench 4', 'ohp 3', 'barbell_row 3', 'biceps_curl 2', 'triceps_pushdown 2']);
    expect(ids('DEADLIFT')).toEqual(['deadlift 3', 'light_squat 2', 'light_bench 3', 'lat_pulldown 3']);
    expect(findExercise('rdl')!.reps).toEqual([8, 8]);
    expect(findExercise('ohp')!.reps).toEqual([6, 8]);
    expect(findExercise('lat_pulldown')!.reps).toEqual([8, 10]);
    expect(findExercise('biceps_curl')!.reps).toEqual([10, 12]);
  });

  test('increments: 5 kg squat and deadlift, 2.5 kg bench and press', () => {
    expect([squat.inc, deadlift.inc, bench.inc, ohp.inc]).toEqual([5, 5, 2.5, 2.5]);
  });

  test('minimum version reuses definitions with 2 sets', () => {
    const min = SESSIONS.MINIMUM.exercises;
    expect(min.map((e) => e.id)).toEqual(['leg_press', 'lat_pulldown', 'plank']);
    expect(min.every((e) => e.sets === 2)).toBe(true);
  });
});
