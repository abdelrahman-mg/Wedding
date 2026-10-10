// Day score, streaks and levels (section 7).
import { LEVEL_TITLES } from '../data/messages';
import { diffDays } from './dates';
import type { ISODate, WorkoutKind } from './types';

export interface DayScoreInput {
  plannedSlots: number;
  mealsDone: number;
  overPenalties: number;
  isGymDay: boolean;
  workout: WorkoutKind | null;
  cardioMinutes: number;
  cardioTarget: number;
  steps: number;
  stepTarget: number;
  water: number;
  protein: number;
  proteinTarget: number;
  sleep: number | null;
  weightLogged: boolean;
}

export interface DayScore {
  total: number;
  meals: number;
  training: number;
  steps: number;
  water: number;
  protein: number;
  bonus: number;
}

export function trainingPoints(isGymDay: boolean, workout: WorkoutKind | null, cardioMinutes: number, cardioTarget: number): number {
  // A completed workout counts on any day; on rest days cardio counts too.
  const w = workout === 'full' ? 25 : workout === 'minimum' ? 17 : workout === 'walk' ? 10 : 0;
  if (isGymDay) return w;
  let c = 0;
  if (cardioTarget > 0 && cardioMinutes > 0) {
    const half = cardioTarget / 2;
    if (cardioMinutes >= cardioTarget) c = 25;
    else if (cardioMinutes >= half) c = 12 + (13 * (cardioMinutes - half)) / half;
    else c = (12 * cardioMinutes) / half;
  }
  return Math.max(w, c);
}

export function dayScore(i: DayScoreInput): DayScore {
  const meals = i.plannedSlots > 0 ? Math.max(0, (40 * i.mealsDone) / i.plannedSlots - 3 * i.overPenalties) : 0;
  const training = trainingPoints(i.isGymDay, i.workout, i.cardioMinutes, i.cardioTarget);
  const steps = i.stepTarget > 0 ? 15 * Math.min(1, i.steps / i.stepTarget) : 0;
  const water = 10 * Math.min(1, i.water / 10);
  const protein = i.proteinTarget > 0 ? 10 * Math.min(1, i.protein / i.proteinTarget) : 0;
  const bonus = (i.sleep != null && i.sleep >= 7 ? 3 : 0) + (i.weightLogged ? 2 : 0);
  const total = Math.min(100, Math.round(meals + training + steps + water + protein + bonus));
  return {
    total,
    meals: Math.round(meals),
    training: Math.round(training),
    steps: Math.round(steps),
    water: Math.round(water),
    protein: Math.round(protein),
    bonus,
  };
}

export const STREAK_THRESHOLD = 70;

/** A day is on plan: kcal within +/-150 of target, protein >= 140 and score >= 70. */
export function isOnPlan(kcal: number, kcalTarget: number, protein: number, score: number): boolean {
  return Math.abs(kcal - kcalTarget) <= 150 && protein >= 140 && score >= STREAK_THRESHOLD;
}

/**
 * Streaks over a contiguous, chronological list of days ending today.
 * One grace day per 14 days: a day below 70 does not break the streak if no other
 * grace day was used in the previous 14 days. Today, if still below 70, is neutral.
 */
export function computeStreaks(days: { date: ISODate; score: number }[], today: ISODate): { current: number; best: number } {
  let run = 0;
  let best = 0;
  let lastGrace: ISODate | null = null;
  for (const d of days) {
    if (d.score >= STREAK_THRESHOLD) {
      run++;
    } else if (d.date === today) {
      // day not over yet
    } else if (run > 0 && (lastGrace === null || diffDays(lastGrace, d.date) >= 14)) {
      lastGrace = d.date;
    } else {
      run = 0;
      lastGrace = null;
    }
    best = Math.max(best, run);
  }
  return { current: run, best };
}

export const XP_PER_LEVEL = 500;

export function levelFor(xp: number): { level: number; title: string; into: number; next: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const title = LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, level - 1)];
  return { level, title, into: xp % XP_PER_LEVEL, next: XP_PER_LEVEL };
}
