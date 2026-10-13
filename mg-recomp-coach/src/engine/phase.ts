import { DELOAD_WEEKS } from '../data/phases';
import { addDays } from './dates';
import type { ISODate } from './types';

export function isScheduledDeload(week: number): boolean {
  return DELOAD_WEEKS.includes(week);
}

/** A triggered deload always covers the 7 days ending on deloadUntil. */
export function isTriggeredDeload(date: ISODate, deloadUntil: ISODate | null): boolean {
  return !!deloadUntil && date <= deloadUntil && date >= addDays(deloadUntil, -6);
}

export function isDeload(week: number, date: ISODate, deloadUntil: ISODate | null): boolean {
  return isScheduledDeload(week) || isTriggeredDeload(date, deloadUntil);
}

/** The first weeks are a learning phase: light weights, focus on form. */
export const LEARNING_WEEKS = 3;

export function isLearningPhase(week: number): boolean {
  return week >= 1 && week <= LEARNING_WEEKS;
}

export const LEARNING_BANNER = 'Learning phase - light weights, focus on form. Add weight slowly; clean reps beat heavy reps.';

/** Working sets for an exercise given the deload state. Learning weeks keep the full prescription. */
export function workingSets(sets: number, _week: number, deload: boolean): number {
  if (deload) return Math.ceil(sets / 2);
  return sets;
}

/** Round to the nearest 2.5 kg plate step. */
export function roundLoad(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

export function deloadLoad(lastWorking: number): number {
  return roundLoad(lastWorking * 0.9);
}

export function liftingModeLabel(week: number, deload: boolean): string {
  if (deload) return 'Deload week: lighter on purpose';
  if (isLearningPhase(week)) return 'Learning phase: light weights, form first';
  return 'Full sets';
}
