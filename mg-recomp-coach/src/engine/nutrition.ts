import { getMeal, SLOT_ORDER, type Slot } from '../data/meals';
import type { DayOfWeek } from '../data/plan';
import { HARD_LIMITS } from '../data/phases';
import type { Adjustments, DayLog, PlanState } from './types';

export interface PlannedSlot {
  slot: Slot;
  mealId: string;
}

export function isGymDay(plan: PlanState, dow: DayOfWeek): boolean {
  return plan.sessionDays[dow] != null;
}

/** Planned slots for a weekday, in order. PG only on gym days. */
export function plannedSlots(plan: PlanState, dow: DayOfWeek, gymOverride?: boolean): PlannedSlot[] {
  const day = plan.meals[dow];
  const gym = gymOverride ?? isGymDay(plan, dow);
  const out: PlannedSlot[] = [];
  for (const slot of SLOT_ORDER) {
    if (slot === 'PG') {
      if (gym) out.push({ slot, mealId: 'PG' });
      continue;
    }
    const id = day[slot];
    if (id) out.push({ slot, mealId: id });
  }
  return out;
}

export function sumMeals(ids: string[]): { kcal: number; protein: number } {
  return ids.reduce(
    (acc, id) => {
      const m = getMeal(id);
      if (m) {
        acc.kcal += m.kcal;
        acc.protein += m.protein;
      }
      return acc;
    },
    { kcal: 0, protein: 0 },
  );
}

export function plannedTotals(plan: PlanState, dow: DayOfWeek, gymOverride?: boolean) {
  return sumMeals(plannedSlots(plan, dow, gymOverride).map((s) => s.mealId));
}

export function planAverageKcal(plan: PlanState): number {
  let total = 0;
  for (let d = 0; d < 7; d++) total += plannedTotals(plan, d as DayOfWeek).kcal;
  return Math.round(total / 7);
}

export interface KcalTargetCtx {
  adjust: Adjustments;
  holiday: boolean;
  deloadActive: boolean;
}

/** Base kcal for a day: the plan total, or the manual override for gym/rest days. */
export function baseKcal(plan: PlanState, dow: DayOfWeek, adjust: Adjustments, gymOverride?: boolean): number {
  const gym = gymOverride ?? isGymDay(plan, dow);
  const manual = gym ? adjust.baseKcalGym : adjust.baseKcalRest;
  return manual ?? plannedTotals(plan, dow, gymOverride).kcal;
}

export function dayKcalTarget(plan: PlanState, dow: DayOfWeek, ctx: KcalTargetCtx, gymOverride?: boolean): number {
  let t = baseKcal(plan, dow, ctx.adjust, gymOverride) + ctx.adjust.kcalAdjust;
  if (ctx.deloadActive) t += ctx.adjust.deloadKcal;
  if (ctx.holiday) t += 300;
  return t;
}

export interface EatenTotals {
  kcal: number;
  protein: number;
  done: number;
  planned: number;
  overPenalties: number;
  treatsLogged: number;
}

/** What was actually eaten that day according to the log. */
export function eatenTotals(slots: PlannedSlot[], log: DayLog | undefined): EatenTotals {
  const res: EatenTotals = { kcal: 0, protein: 0, done: 0, planned: slots.length, overPenalties: 0, treatsLogged: 0 };
  if (!log) return res;
  for (const s of slots) {
    const entry = log.meals[s.slot];
    if (!entry || entry.status === 'skipped') continue;
    const planned = getMeal(s.mealId);
    if (entry.status === 'eaten') {
      const m = getMeal(entry.mealId ?? s.mealId);
      if (m) {
        res.kcal += m.kcal;
        res.protein += m.protein;
        if (m.id === 'T') res.treatsLogged++;
      }
      res.done++;
    } else if (entry.status === 'planB') {
      const m = entry.mealId ? getMeal(entry.mealId) : undefined;
      if (m) {
        res.kcal += m.kcal;
        res.protein += m.protein;
        if (m.id === 'T') res.treatsLogged++;
      }
      res.done++;
    } else if (entry.status === 'custom' && entry.custom) {
      res.kcal += entry.custom.kcal;
      res.protein += entry.custom.protein;
      res.done++;
      if (planned && entry.custom.kcal - planned.kcal > 300) res.overPenalties++;
      if (entry.custom.treat) res.treatsLogged++;
    }
  }
  return res;
}

/**
 * Removal suggestions when kcalAdjust is negative: the app removes items rather than
 * editing portions silently.
 */
export function kcalRemovalSuggestions(kcalAdjust: number): string[] {
  if (kcalAdjust >= 0) return [];
  const out: string[] = [];
  let left = -kcalAdjust;
  const options = [
    { text: 'Cut 1 tsp of oil per day (about 40 kcal)', kcal: 40 },
    { text: 'Skip the night banana (about 50 kcal)', kcal: 50 },
    { text: 'Half a baladi loaf less at one meal (about 70 kcal)', kcal: 70 },
    { text: '1/4 cup less rice at lunch (about 50 kcal)', kcal: 50 },
  ];
  for (const o of options) {
    if (left <= 0) break;
    out.push(o.text);
    left -= o.kcal;
  }
  return out;
}

export const KCAL_FLOOR = HARD_LIMITS.kcalFloor;

/** Protein gap fix suggestion, e.g. "You are 25 g short, use N2 tonight". */
export function proteinFix(gap: number): string {
  if (gap <= 0) return 'Protein is covered. Nice.';
  if (gap <= 20) return `You are ${Math.round(gap)} g short: add 1 Greek yogurt cup (16 g).`;
  if (gap <= 45) return `You are ${Math.round(gap)} g short: use N2 tonight (whey in Greek yogurt, 40 g).`;
  return `You are ${Math.round(gap)} g short: N2 tonight (40 g) plus 2 boiled eggs tomorrow morning.`;
}
