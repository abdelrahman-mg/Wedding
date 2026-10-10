import { DAY_TOTAL_FIXTURES, DAYS } from '../src/data/plan';
import { defaultPlan } from '../src/engine/defaults';
import { shoppingList, weeklyCounts } from '../src/engine/shopping';
import { eatenTotals, plannedSlots, plannedTotals, planAverageKcal } from '../src/engine/nutrition';

describe('day totals (4.3)', () => {
  const plan = defaultPlan();

  test.each(DAYS)('day %i matches the brief', (dow) => {
    const t = plannedTotals(plan, dow);
    expect(t).toEqual(DAY_TOTAL_FIXTURES[dow]);
  });

  test('PG only on gym days 1, 3, 5, 6', () => {
    for (const d of DAYS) {
      const hasPG = plannedSlots(plan, d).some((s) => s.slot === 'PG');
      expect(hasPG).toBe([1, 3, 5, 6].includes(d));
    }
  });

  test('moving a session moves PG with it', () => {
    const p = defaultPlan();
    p.sessionDays[1] = null;
    p.sessionDays[2] = 'UPPER_A';
    expect(plannedSlots(p, 1).some((s) => s.slot === 'PG')).toBe(false);
    expect(plannedSlots(p, 2).some((s) => s.slot === 'PG')).toBe(true);
  });

  test('plan average is about 1,950 kcal', () => {
    const avg = planAverageKcal(plan);
    expect(avg).toBeGreaterThan(1900);
    expect(avg).toBeLessThan(2000);
  });

  test('eaten totals: planned, Plan B, custom, skipped', () => {
    const slots = plannedSlots(plan, 0); // B3 M2 L1 D1 N4
    const t = eatenTotals(slots, {
      water: 0,
      meals: {
        B: { status: 'eaten' },
        M: { status: 'planB', mealId: 'M3' },
        L: { status: 'custom', custom: { name: 'Big shawarma', kcal: 900, protein: 40 } },
        D: { status: 'skipped' },
      },
    });
    expect(t.kcal).toBe(490 + 190 + 900);
    expect(t.protein).toBe(37 + 24 + 40);
    expect(t.done).toBe(3);
    expect(t.planned).toBe(5);
    expect(t.overPenalties).toBe(1); // 900 vs 515 planned lunch
  });
});

describe('shopping list', () => {
  test('default plan shows the default list', () => {
    const r = shoppingList(defaultPlan());
    expect(r.edited).toBe(false);
    expect(r.items.find((i) => i.id === 'eggs')!.display).toBe('24');
  });
  test('edited plan rescales countable items', () => {
    const p = defaultPlan();
    p.meals[0].N = 'N2'; // swap N4 (banana half) for N2 (whey)
    const before = weeklyCounts(defaultPlan()).whey;
    expect(weeklyCounts(p).whey).toBe(before + 1);
    const r = shoppingList(p);
    expect(r.edited).toBe(true);
    expect(r.items.find((i) => i.id === 'whey')!.display).toMatch(/default 7 scoops/);
  });
});
