// Timezone-safe date helpers. All app dates are local calendar dates as 'YYYY-MM-DD'.
// Arithmetic goes through UTC on the calendar components so DST shifts never move a day.
import type { ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** Local midnight Date for the given ISO date. */
export function parseISO(iso: ISODate): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d);
}

function utcDays(iso: ISODate): number {
  const [y, m, d] = parts(iso);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const [y, m, d] = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return utcDays(b) - utcDays(a);
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(iso: ISODate): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Sunday that starts the statistics week containing iso. */
export function weekStart(iso: ISODate): ISODate {
  return addDays(iso, -dayOfWeek(iso));
}

export function weekEnd(iso: ISODate): ISODate {
  return addDays(weekStart(iso), 6);
}

export function weekDates(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Program week: floor(daysSinceStart / 7) + 1. Returns 0 before the start date. Uncapped. */
export function programWeek(startDate: ISODate, iso: ISODate): number {
  const d = diffDays(startDate, iso);
  if (d < 0) return 0;
  return Math.floor(d / 7) + 1;
}

/** Roadmap week, capped at 12. */
export function roadmapWeek(startDate: ISODate, iso: ISODate): number {
  return Math.min(12, programWeek(startDate, iso));
}

/**
 * Program week used for a Sunday-to-Saturday statistics week: the program week
 * of that week's Saturday. A partial first week counts as week 1.
 */
export function statsWeekNumber(startDate: ISODate, sunday: ISODate): number {
  return programWeek(startDate, addDays(sunday, 6));
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return a < b; // lexical compare works for YYYY-MM-DD
}

export function rangeDates(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function formatShort(iso: ISODate): string {
  const d = parseISO(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatLong(iso: ISODate): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[dayOfWeek(iso)]}, ${formatShort(iso)}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
