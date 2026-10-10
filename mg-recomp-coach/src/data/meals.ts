// Meal library. All amounts are cooked, measured with cups, spoons, palms and pieces.
// Source of truth: the MG Recomp Coach brief, section 4. Edit values here, not in screens.

export type Slot = 'B' | 'M' | 'L' | 'PG' | 'D' | 'N';

export interface MealDef {
  slot: Slot;
  name: string;
  desc: string;
  kcal: number;
  protein: number;
}

export interface EmergencyMealDef {
  name: string;
  desc: string;
  kcal: number;
  protein: number;
}

export const SLOT_ORDER: Slot[] = ['B', 'M', 'L', 'PG', 'D', 'N'];

export const SLOT_INFO: Record<Slot, { label: string; time: string }> = {
  B: { label: 'Breakfast', time: '08:00' },
  M: { label: 'Work snack', time: '11:30' },
  L: { label: 'Lunch', time: '14:30' },
  PG: { label: 'Pre-gym', time: '17:15' },
  D: { label: 'Dinner', time: '20:30' },
  N: { label: 'Night snack', time: '22:30' },
};

export const MEALS = {
  // Breakfast
  B1: { slot: 'B', name: 'Foul plate', desc: '1 cup foul with 1 tsp oil, lemon, cumin, tomato; 2 boiled eggs; half baladi loaf; cucumber', kcal: 510, protein: 30 },
  B2: { slot: 'B', name: '3-egg omelet plate', desc: '3-egg omelet with tomato and pepper (1 tsp oil); half baladi loaf; 1 Greek yogurt cup', kcal: 470, protein: 39 },
  B3: { slot: 'B', name: 'Oats bowl', desc: '5 tbsp oats, 1 scoop whey, 1 cup half-fat milk, 1 banana', kcal: 490, protein: 37 },
  B4: { slot: 'B', name: 'Egg and cheese loaf', desc: '1 baladi loaf, 2 scrambled eggs (1 tsp oil), a matchbox of low-fat white cheese, tomato and cucumber', kcal: 510, protein: 28 },
  // Work snack
  M1: { slot: 'M', name: 'Yogurt and apple', desc: '1 Greek yogurt cup (about 170 g), 1 small apple', kcal: 180, protein: 17 },
  M2: { slot: 'M', name: 'Eggs and cheese', desc: '2 boiled eggs, 1 low-fat cheese triangle, cucumber', kcal: 210, protein: 15 },
  M3: { slot: 'M', name: 'Whey shake and apple', desc: '1 scoop whey in water, 1 small apple', kcal: 190, protein: 24 },
  // Lunch
  L1: { slot: 'L', name: 'Chicken, rice, salad', desc: '1.5 palms grilled chicken breast, 1 cup cooked rice, big salad with 1 tsp oil and lemon', kcal: 515, protein: 52 },
  L2: { slot: 'L', name: 'Kofta plate', desc: '2-3 fingers lean grilled kofta (1 palm), 3/4 cup rice, big salad, 1/2 cup plain yogurt', kcal: 550, protein: 37 },
  L3: { slot: 'L', name: 'Light koshari and chicken', desc: '3/4 cup rice-pasta-lentil mix, tomato sauce, 1 tbsp crispy onions, 1 palm chicken', kcal: 480, protein: 46 },
  L4: { slot: 'L', name: 'Oven chicken thighs', desc: '2 skinless oven chicken thighs, roasted zucchini and peppers (1 tsp oil), 3/4 cup rice', kcal: 550, protein: 42 },
  L5: { slot: 'L', name: 'Molokhia and chicken', desc: '1.5 cups molokhia (light oil), 1.5 palms chicken breast, 1/2 cup rice, half baladi loaf', kcal: 560, protein: 58 },
  T: { slot: 'L', name: 'Planned treat lunch', desc: '2 thin-crust pizza slices OR 1 savory chicken crepe, with a side salad. No fries, no extra cheese or dips', kcal: 630, protein: 25 },
  // Pre-gym (gym days only)
  PG: { slot: 'PG', name: 'Pre-gym banana and coffee', desc: '1 banana, black coffee', kcal: 105, protein: 1 },
  // Dinner
  D1: { slot: 'D', name: 'Oven chicken and sweet potato', desc: '1.5 palms oven chicken breast, 1 large baked sweet potato, 1.5 cups green beans or zucchini (1 tsp oil)', kcal: 510, protein: 52 },
  D2: { slot: 'D', name: 'Mince stew', desc: '1 palm lean mince stew with vegetables, half baladi loaf, salad, 1 Greek yogurt cup', kcal: 500, protein: 45 },
  D3: { slot: 'D', name: 'Shakshuka plate', desc: 'Shakshuka (3 eggs, tomato sauce, 1 tsp oil), half baladi loaf, 1/2 cup cottage cheese, salad', kcal: 500, protein: 36 },
  D4: { slot: 'D', name: 'Chicken tawook', desc: '1.5 palms grilled chicken tawook, 1 cup grilled vegetables, half baladi loaf, 2 tbsp garlic yogurt', kcal: 470, protein: 50 },
  D5: { slot: 'D', name: 'Lentil soup and eggs', desc: '1.5 cups lentil soup, 2 boiled eggs, half baladi loaf, salad', kcal: 510, protein: 31 },
  // Night snack
  N1: { slot: 'N', name: 'Yogurt and honey', desc: '1 Greek yogurt cup, 1 tsp honey', kcal: 130, protein: 16 },
  N2: { slot: 'N', name: 'Protein yogurt', desc: '1 scoop whey stirred into 1 Greek yogurt cup', kcal: 220, protein: 40 },
  N3: { slot: 'N', name: 'Popcorn and egg', desc: '3 cups air-popped popcorn, 1 boiled egg', kcal: 160, protein: 9 },
  N4: { slot: 'N', name: 'Yogurt and banana', desc: '1 Greek yogurt cup, half a banana', kcal: 150, protein: 16 },
} satisfies Record<string, MealDef>;

export type MealId = keyof typeof MEALS;

// Emergency / no-cooking meals. Usable in slots B, L and D.
export const EMERGENCY = {
  E1: { name: '3 eggs, bread, veg', desc: '3 boiled eggs, 1 baladi loaf, tomato and cucumber', kcal: 460, protein: 26 },
  E2: { name: 'Delivery grilled plate', desc: '1.5 palms grilled chicken or kebab, 1 cup rice OR bread (not both), salad, no fries, no extra sauce', kcal: 550, protein: 50 },
  E3: { name: 'Rotisserie chicken plate', desc: '1.5 palms rotisserie chicken (no skin), salad, half baladi loaf', kcal: 390, protein: 50 },
  E4: { name: 'Whey yogurt and banana', desc: 'N2 plus 1 banana', kcal: 325, protein: 41 },
  E5: { name: 'Foul and yogurt', desc: 'Foul plate without eggs plus 1 Greek yogurt cup', kcal: 430, protein: 29 },
} satisfies Record<string, EmergencyMealDef>;

export type EmergencyId = keyof typeof EMERGENCY;
export const EMERGENCY_SLOTS: Slot[] = ['B', 'L', 'D'];

export const TREAT_MEAL_ID = 'T';

export interface AnyMeal {
  id: string;
  name: string;
  desc: string;
  kcal: number;
  protein: number;
  slot: Slot | 'E';
}

export function getMeal(id: string): AnyMeal | undefined {
  if (id in MEALS) {
    const m = MEALS[id as MealId];
    return { id, ...m };
  }
  if (id in EMERGENCY) {
    const m = EMERGENCY[id as EmergencyId];
    return { id, ...m, slot: 'E' };
  }
  return undefined;
}

export function mealsForSlot(slot: Slot): AnyMeal[] {
  return (Object.keys(MEALS) as MealId[])
    .filter((id) => MEALS[id].slot === slot)
    .map((id) => ({ id, ...MEALS[id] }));
}

export function emergencyMeals(): AnyMeal[] {
  return (Object.keys(EMERGENCY) as EmergencyId[]).map((id) => ({ id, ...EMERGENCY[id], slot: 'E' as const }));
}
