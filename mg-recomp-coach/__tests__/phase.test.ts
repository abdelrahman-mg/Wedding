import { addDays } from '../src/engine/dates';
import { defaultData } from '../src/engine/defaults';
import { deloadLoad, isDeload, targetRir, workingSets } from '../src/engine/phase';
import { countDroppingExercises, deloadProposal, earlyDeloadCheck } from '../src/engine/rules';
import { dayContext } from '../src/engine/selectors';
import type { ExerciseSession } from '../src/engine/progression';

describe('phase logic (5.6)', () => {
  test('ease-in weeks 1-2: min(sets, 2) at RIR 3-4', () => {
    expect(workingSets(3, 1, false)).toBe(2);
    expect(workingSets(2, 2, false)).toBe(2);
    expect(targetRir('2-3', 1, false)).toBe('3-4');
  });

  test('full sets weeks 3-5 and 7-11', () => {
    for (const w of [3, 4, 5, 7, 8, 9, 10, 11]) expect(workingSets(3, w, isDeload(w, '2026-01-01', null))).toBe(3);
  });

  test('deload weeks 6 and 12: ceil(sets/2), RIR 4, ~90% load', () => {
    expect(isDeload(6, '2026-01-01', null)).toBe(true);
    expect(isDeload(12, '2026-01-01', null)).toBe(true);
    expect(workingSets(3, 6, true)).toBe(2);
    expect(workingSets(2, 12, true)).toBe(1);
    expect(targetRir('2-3', 6, true)).toBe('4');
    expect(deloadLoad(50)).toBe(45);
  });

  test('early deload triggered by the rules engine', () => {
    const today = '2026-11-10';
    const res = earlyDeloadCheck({ droppingExercises: 0, sleepLast5: [5, 5.5, 6, 5, null], energyLast5: [3, 3, 3, 3, 3] });
    expect(res.trigger).toBe(true);
    const p = deloadProposal(today, res.reasons, 0);
    expect(p.apply[0]).toEqual({ type: 'deloadUntil', value: addDays(today, 6) });

    const data = defaultData();
    data.profile.startDate = '2026-10-11'; // today is week 5
    data.adjust.deloadUntil = addDays(today, 6);
    const ctx = dayContext(data, today);
    expect(ctx.deload).toBe(true);
    const ctx2 = dayContext(data, '2026-11-01'); // week 4, before the trigger
    expect(ctx2.deload).toBe(false);
    // Triggered deload adds 150 kcal for that week.
    expect(ctx.kcalTarget - dayContext({ ...data, adjust: { ...data.adjust, deloadUntil: null } }, today).kcalTarget).toBe(150);
  });

  test('energy 1-2 on 3 of 5 days triggers', () => {
    expect(earlyDeloadCheck({ droppingExercises: 0, sleepLast5: [], energyLast5: [1, 2, 4, 2, 3] }).trigger).toBe(true);
    expect(earlyDeloadCheck({ droppingExercises: 0, sleepLast5: [7, 7, 7], energyLast5: [1, 3, 4, 2, 3] }).trigger).toBe(false);
  });

  test('strength falling on 3+ exercises triggers', () => {
    const s = (w: number, r: number): ExerciseSession => ({ date: '2026-10-01', deload: false, sets: [{ weight: w, reps: r, rir: 2 }] });
    const falling = [s(50, 10), s(50, 9), s(47.5, 9)];
    const fine = [s(50, 10), s(50, 11), s(50, 12)];
    expect(countDroppingExercises([falling, falling, falling, fine])).toBe(3);
    expect(earlyDeloadCheck({ droppingExercises: 3, sleepLast5: [], energyLast5: [] }).trigger).toBe(true);
    expect(earlyDeloadCheck({ droppingExercises: 2, sleepLast5: [], energyLast5: [] }).trigger).toBe(false);
  });
});
