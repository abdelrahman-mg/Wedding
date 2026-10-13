import { HARD_LIMITS, PHASES, WEEK_TARGETS, type WeekTarget } from '../data/phases';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Target loss per week (kg) for the weekly average. */
export const LOSS_MIN = 0.3;
export const LOSS_MAX = 0.7;

/** Expected weekly-average weight for week t (1..12): the middle of the target loss rate. */
export function expectedWeight(t: number, w0: number): number {
  return r2(w0 - ((LOSS_MIN + LOSS_MAX) / 2) * t);
}

/** Target path: losing 0.3 kg/week (high edge) to 0.7 kg/week (low edge). */
export function weightBand(t: number, w0: number): { low: number; high: number; expected: number } {
  return { low: r2(w0 - LOSS_MAX * t), high: r2(w0 - LOSS_MIN * t), expected: expectedWeight(t, w0) };
}

export function weekTarget(week: number): WeekTarget {
  const w = Math.max(1, Math.min(12, week));
  return WEEK_TARGETS[w - 1];
}

export function phaseName(week: number): string {
  return PHASES[weekTarget(week).phase].name;
}

/** Step target for a program week including the engine adjustment, never above the cap. */
export function stepTarget(week: number, stepsAdjust: number, cap: number = HARD_LIMITS.stepsMax): number {
  return Math.min(cap, weekTarget(week).steps + stepsAdjust);
}

export function cardioTarget(week: number, cardioAdjust: number, max: number = HARD_LIMITS.cardioMax): number {
  const v = weekTarget(week).cardio + cardioAdjust;
  return Math.max(HARD_LIMITS.cardioMin, Math.min(max, v));
}
