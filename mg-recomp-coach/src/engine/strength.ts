// Strength trend (section 6.6): Epley estimated strength.
import { findExercise, MAIN_LIFTS } from '../data/sessions';
import type { ISODate, WorkoutLog } from './types';

export function epley(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

export interface StrengthPoint {
  date: ISODate;
  value: number;
}

/** Best estimated strength per session for a main lift (matches by original exercise name). */
export function strengthSeries(workouts: WorkoutLog[], ids: string[]): StrengthPoint[] {
  const names = ids.map((id) => findExercise(id)?.name).filter(Boolean) as string[];
  const out: StrengthPoint[] = [];
  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startedAt - b.startedAt));
  for (const w of sorted) {
    if (w.deload) continue;
    const sets = w.sets.filter((s) => s.done && names.includes(s.nameUsed));
    if (!sets.length) continue;
    const best = Math.max(...sets.map((s) => epley(s.weight ?? 0, s.reps ?? 0)));
    if (best > 0) out.push({ date: w.date, value: Math.round(best * 10) / 10 });
  }
  return out;
}

export function percentChange(series: StrengthPoint[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (!first) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

export function allMainLiftTrends(workouts: WorkoutLog[]) {
  return MAIN_LIFTS.map((l) => {
    const series = strengthSeries(workouts, l.ids);
    return { ...l, series, change: percentChange(series) };
  });
}

export interface LiftPoint {
  date: ISODate;
  /** Heaviest completed set of the session (kg). */
  weight: number;
  reps: number;
}

/** Top working weight per session for a main lift (what you actually put on the bar). */
export function liftSeries(workouts: WorkoutLog[], ids: string[]): LiftPoint[] {
  const names = ids.map((id) => findExercise(id)?.name).filter(Boolean) as string[];
  const out: LiftPoint[] = [];
  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startedAt - b.startedAt));
  for (const w of sorted) {
    if (w.deload) continue;
    const sets = w.sets.filter((s) => s.done && names.includes(s.nameUsed) && (s.weight ?? 0) > 0);
    if (!sets.length) continue;
    const top = Math.max(...sets.map((s) => s.weight as number));
    const reps = Math.max(...sets.filter((s) => s.weight === top).map((s) => s.reps ?? 0));
    out.push({ date: w.date, weight: top, reps });
  }
  return out;
}

export function allLiftSeries(workouts: WorkoutLog[]) {
  return MAIN_LIFTS.map((l) => {
    const series = liftSeries(workouts, l.ids);
    const first = series[0]?.weight ?? 0;
    const last = series[series.length - 1]?.weight ?? 0;
    return { ...l, series, gain: series.length >= 2 ? Math.round((last - first) * 10) / 10 : null };
  });
}
