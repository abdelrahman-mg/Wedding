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

/** Working sets for an exercise given the program week and deload state. */
export function workingSets(sets: number, week: number, deload: boolean): number {
  if (deload) return Math.ceil(sets / 2);
  if (week <= 2) return Math.min(sets, 2);
  return sets;
}

export function targetRir(baseRir: string, week: number, deload: boolean): string {
  if (baseRir === '-') return '-';
  if (deload) return '4';
  if (week <= 2) return '3-4';
  return baseRir;
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
  if (week <= 2) return 'Ease-in: 2 sets per exercise, RIR 3-4';
  return 'Full sets';
}
