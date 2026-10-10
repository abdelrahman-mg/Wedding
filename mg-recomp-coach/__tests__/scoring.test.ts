import { addDays } from '../src/engine/dates';
import { computeStreaks, dayScore, isOnPlan, levelFor, trainingPoints, type DayScoreInput } from '../src/engine/scoring';

const perfect: DayScoreInput = {
  plannedSlots: 6,
  mealsDone: 6,
  overPenalties: 0,
  isGymDay: true,
  workout: 'full',
  cardioMinutes: 0,
  cardioTarget: 20,
  steps: 8000,
  stepTarget: 8000,
  water: 10,
  protein: 160,
  proteinTarget: 160,
  sleep: 7.5,
  weightLogged: true,
};

describe('day score (7.1)', () => {
  test('perfect day caps at 100', () => {
    expect(dayScore(perfect).total).toBe(100);
  });

  test('components', () => {
    const s = dayScore({ ...perfect, mealsDone: 3, workout: null, steps: 4000, water: 5, protein: 80, sleep: 6, weightLogged: false });
    expect(s.meals).toBe(20);
    expect(s.training).toBe(0);
    expect(s.steps).toBe(8); // 7.5
    expect(s.water).toBe(5);
    expect(s.protein).toBe(5);
    expect(s.bonus).toBe(0);
    expect(s.total).toBe(38); // 20 + 0 + 7.5 + 5 + 5 = 37.5
  });

  test('custom meal 300+ kcal over plan subtracts 3', () => {
    const a = dayScore({ ...perfect, sleep: null, weightLogged: false });
    const b = dayScore({ ...perfect, sleep: null, weightLogged: false, overPenalties: 1 });
    expect(a.total - b.total).toBe(3);
  });

  test('training points: full 25, minimum 17, walk 10', () => {
    expect(trainingPoints(true, 'full', 0, 20)).toBe(25);
    expect(trainingPoints(true, 'minimum', 0, 20)).toBe(17);
    expect(trainingPoints(true, 'walk', 0, 20)).toBe(10);
  });

  test('rest day cardio: 25 at target, 12 at half', () => {
    expect(trainingPoints(false, null, 30, 30)).toBe(25);
    expect(trainingPoints(false, null, 15, 30)).toBe(12);
    expect(trainingPoints(false, null, 0, 30)).toBe(0);
    expect(trainingPoints(false, null, 7.5, 30)).toBe(6);
  });

  test('on plan rule', () => {
    expect(isOnPlan(1900, 2000, 150, 75)).toBe(true);
    expect(isOnPlan(1840, 2000, 150, 75)).toBe(false);
    expect(isOnPlan(2000, 2000, 139, 75)).toBe(false);
    expect(isOnPlan(2000, 2000, 150, 69)).toBe(false);
  });
});

describe('streaks (7.2)', () => {
  const start = '2026-10-01';
  const days = (scores: number[]) => scores.map((score, i) => ({ date: addDays(start, i), score }));
  const lastDay = (n: number) => addDays(start, n - 1);

  test('consecutive days at 70+', () => {
    const d = days([80, 75, 90, 71]);
    expect(computeStreaks(d, lastDay(4))).toEqual({ current: 4, best: 4 });
  });

  test('one grace day per 14 days keeps the streak', () => {
    const d = days([80, 80, 50, 80, 80]);
    expect(computeStreaks(d, lastDay(5)).current).toBe(4);
  });

  test('a second miss within 14 days breaks it', () => {
    const d = days([80, 80, 50, 80, 50, 80]);
    expect(computeStreaks(d, lastDay(6))).toEqual({ current: 1, best: 3 });
  });

  test('grace is available again after 14 days', () => {
    const scores = [80, 50, ...Array(13).fill(80), 50, 80];
    const d = days(scores);
    expect(computeStreaks(d, lastDay(scores.length)).current).toBe(15);
  });

  test('today below 70 does not break the streak yet', () => {
    const d = days([80, 80, 10]);
    expect(computeStreaks(d, lastDay(3)).current).toBe(2);
  });

  test('levels every 500 XP', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, title: 'Starter' });
    expect(levelFor(499).level).toBe(1);
    expect(levelFor(500)).toMatchObject({ level: 2, title: 'Regular' });
    expect(levelFor(1250)).toMatchObject({ level: 3, into: 250 });
  });
});
