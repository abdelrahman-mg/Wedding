import { findExercise, SESSIONS } from '../src/data/sessions';
import { FIRST_TIME_MESSAGE, isPR, suggestProgression, type ExerciseSession } from '../src/engine/progression';

const chest = findExercise('chest_press_machine')!; // upper, 8-12
const legPress = findExercise('leg_press')!; // lower, 10-12
const plank = findExercise('plank')!; // timed 20-40
const deadBug = findExercise('dead_bug')!; // bodyweight 8-8

const sess = (date: string, sets: [number | null, number, number | null][], deload = false): ExerciseSession => ({
  date,
  deload,
  sets: sets.map(([weight, reps, rir]) => ({ weight, reps, rir })),
});

describe('progression (5.5)', () => {
  test('first time ever: no prefill', () => {
    const s = suggestProgression(chest, []);
    expect(s.kind).toBe('first');
    expect(s.weight).toBeNull();
    expect(s.message).toBe(FIRST_TIME_MESSAGE);
  });

  test('add load +2.5 kg for upper, reset reps to bottom', () => {
    const s = suggestProgression(chest, [sess('2026-10-01', [[40, 12, 2], [40, 12, 3], [40, 12, 2]])]);
    expect(s.kind).toBe('addLoad');
    expect(s.weight).toBe(42.5);
    expect(s.targetReps).toBe(8);
    expect(s.message).toMatch(/next pin/);
  });

  test('add load +5 kg for lower', () => {
    const s = suggestProgression(legPress, [sess('2026-10-01', [[100, 12, 2], [100, 12, 2], [100, 12, 2]])]);
    expect(s.kind).toBe('addLoad');
    expect(s.weight).toBe(105);
    expect(s.targetReps).toBe(10);
  });

  test('top reps but RIR below 2 does not add load', () => {
    const s = suggestProgression(chest, [sess('2026-10-01', [[40, 12, 1], [40, 12, 2], [40, 12, 2]])]);
    expect(s.kind).toBe('addRep');
    expect(s.weight).toBe(40);
  });

  test('any set below the range: hold', () => {
    const s = suggestProgression(chest, [sess('2026-10-01', [[40, 9, 2], [40, 8, 2], [40, 7, 2]])]);
    expect(s.kind).toBe('hold');
    expect(s.weight).toBe(40);
    expect(s.targetReps).toBe(8);
  });

  test('below the range twice in a row: reduce 5-10%', () => {
    const s = suggestProgression(chest, [
      sess('2026-09-28', [[40, 9, 2], [40, 7, 2]]),
      sess('2026-10-01', [[40, 8, 2], [40, 7, 2]]),
    ]);
    expect(s.kind).toBe('reduce');
    expect(s.weight).toBeLessThan(40 * 0.96);
    expect(s.weight).toBeGreaterThanOrEqual(36);
  });

  test('otherwise: same weight, +1 rep', () => {
    const s = suggestProgression(chest, [sess('2026-10-01', [[40, 10, 2], [40, 9, 2], [40, 9, 3]])]);
    expect(s.kind).toBe('addRep');
    expect(s.weight).toBe(40);
    expect(s.targetReps).toBe(10);
  });

  test('sessions with fewer than min(2, sets) logged sets are ignored', () => {
    const s = suggestProgression(chest, [sess('2026-10-01', [[40, 12, 2]])]);
    expect(s.kind).toBe('first');
  });

  test('timed: +5 s until top, then add a set (max 4)', () => {
    const a = suggestProgression(plank, [sess('2026-10-01', [[null, 25, null], [null, 20, null]])]);
    expect(a.kind).toBe('addTime');
    expect(a.targetReps).toBe(25);
    const b = suggestProgression(plank, [sess('2026-10-01', [[null, 40, null], [null, 40, null], [null, 40, null]])]);
    expect(b.kind).toBe('addSet');
    expect(b.sets).toBe(4);
    const c = suggestProgression(plank, [sess('2026-10-01', [[null, 40, null], [null, 40, null], [null, 40, null], [null, 40, null]])]);
    expect(c.sets).toBe(4);
  });

  test('bodyweight: reps first', () => {
    const s = suggestProgression(deadBug, [sess('2026-10-01', [[null, 6, null], [null, 7, null]])]);
    expect(s.kind).toBe('addRep');
    expect(s.weight).toBeNull();
    expect(s.targetReps).toBe(7);
  });

  test('stall: no progress in 3 consecutive sessions', () => {
    const h = [
      sess('2026-09-01', [[40, 10, 2], [40, 10, 2]]),
      sess('2026-09-04', [[40, 10, 2], [40, 9, 2]]),
      sess('2026-09-08', [[40, 10, 2], [40, 10, 2]]),
      sess('2026-09-11', [[40, 9, 2], [40, 9, 2]]),
    ];
    const s = suggestProgression(chest, h);
    expect(s.stall).toBe(true);
    expect(s.stallMessage).toMatch(/sleep, protein and calories/);
    expect(s.suggestSwap).toBe(false);
  });

  test('stall for 6+ weeks suggests a swap', () => {
    const h = [
      sess('2026-08-01', [[40, 10, 2], [40, 10, 2]]),
      sess('2026-08-20', [[40, 10, 2], [40, 9, 2]]),
      sess('2026-09-05', [[40, 10, 2], [40, 10, 2]]),
      sess('2026-09-20', [[40, 9, 2], [40, 9, 2]]),
    ];
    expect(suggestProgression(chest, h).suggestSwap).toBe(true);
  });

  test('progress resets the stall', () => {
    const h = [
      sess('2026-09-01', [[40, 10, 2], [40, 10, 2]]),
      sess('2026-09-04', [[40, 10, 2], [40, 9, 2]]),
      sess('2026-09-08', [[40, 11, 2], [40, 10, 2]]),
      sess('2026-09-11', [[40, 10, 2], [40, 10, 2]]),
    ];
    expect(suggestProgression(chest, h).stall).toBe(false);
  });

  test('deload sessions are not used as the reference', () => {
    const s = suggestProgression(chest, [
      sess('2026-10-01', [[40, 12, 2], [40, 12, 2], [40, 12, 2]]),
      sess('2026-10-08', [[35, 10, 4], [35, 10, 4]], true),
    ]);
    expect(s.kind).toBe('addLoad');
    expect(s.weight).toBe(42.5);
  });

  test('personal records', () => {
    const prev = [sess('2026-10-01', [[40, 10, 2]])];
    expect(isPR(sess('2026-10-04', [[42.5, 8, 2]]), prev)).toBe(true);
    expect(isPR(sess('2026-10-04', [[40, 11, 2]]), prev)).toBe(true);
    expect(isPR(sess('2026-10-04', [[40, 10, 2]]), prev)).toBe(false);
    expect(isPR(sess('2026-10-04', [[40, 10, 2]]), [])).toBe(false);
  });

  test('minimum version reuses definitions with 2 sets', () => {
    const min = SESSIONS.MINIMUM.exercises;
    expect(min.map((e) => e.id)).toEqual(['leg_press', 'chest_press_machine', 'seated_cable_row', 'plank']);
    expect(min.every((e) => e.sets === 2)).toBe(true);
  });
});
