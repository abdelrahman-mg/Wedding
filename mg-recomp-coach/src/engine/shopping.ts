// Rescale countable shopping items when the weekly plan changes.
import { DEFAULT_SHOPPING, MEAL_COUNTS, type ShoppingItem } from '../data/guides';
import type { DayOfWeek } from '../data/plan';
import { defaultPlan } from './defaults';
import { plannedSlots } from './nutrition';
import type { PlanState } from './types';

export function weeklyCounts(plan: PlanState): Record<string, number> {
  const out: Record<string, number> = {};
  for (let d = 0; d < 7; d++) {
    for (const s of plannedSlots(plan, d as DayOfWeek)) {
      for (const [k, v] of Object.entries(MEAL_COUNTS[s.mealId] ?? {})) out[k] = (out[k] ?? 0) + (v ?? 0);
    }
  }
  return out;
}

export function shoppingList(plan: PlanState): { items: (ShoppingItem & { display: string })[]; edited: boolean } {
  const base = weeklyCounts(defaultPlan());
  const cur = weeklyCounts(plan);
  const edited = JSON.stringify(plan.meals) !== JSON.stringify(defaultPlan().meals) || JSON.stringify(plan.sessionDays) !== JSON.stringify(defaultPlan().sessionDays);
  const items = DEFAULT_SHOPPING.map((it) => {
    if (!edited || it.perWeekDefault == null || !base[it.id]) return { ...it, display: it.qty };
    // Keep the default buffer: scale the default quantity by the plan ratio.
    const n = Math.ceil((it.perWeekDefault * (cur[it.id] ?? 0)) / base[it.id]);
    const unit = it.unit ? ` ${it.unit}` : '';
    return { ...it, display: n === it.perWeekDefault ? it.qty : `${n}${unit} (default ${it.qty})` };
  });
  return { items, edited };
}
