// Everyday Egyptian foods counted in portions, not grams. No fish.
// Hand guide: palm = protein, fist = carbs, cupped hand = veg, thumb = fats.
// Numbers are rough estimates per portion (cooked).

export type FoodGroup = 'protein' | 'carb' | 'veg' | 'fat' | 'shake';

export interface FoodDef {
  id: string;
  name: string;
  group: FoodGroup;
  /** What one portion is, in hands, spoons, cups or pieces. */
  portion: string;
  kcal: number;
  protein: number;
}

export const GROUPS: { id: FoodGroup; label: string; hand: string; guide: string }[] = [
  { id: 'protein', label: 'Protein', hand: 'palm', guide: '1 palm = the size and thickness of your palm (chicken, kofta, meat).' },
  { id: 'carb', label: 'Carbs', hand: 'fist', guide: '1 fist = a closed fist, about 3/4 cup cooked (rice, pasta, potato, foul).' },
  { id: 'veg', label: 'Veg', hand: 'cupped hand', guide: '1 cupped hand = what fits in one cupped palm. Salad and cooked veg.' },
  { id: 'fat', label: 'Fats', hand: 'thumb', guide: '1 thumb = the tip of your thumb, about 1 tsp of oil or 6-8 nuts.' },
  { id: 'shake', label: 'Shakes', hand: 'scoop', guide: '1 scoop = the scoop in the tub. Protein shake counts toward your protein target.' },
];

export const FOODS: FoodDef[] = [
  // Protein: palms, pieces, cups
  { id: 'chicken_palm', name: 'Grilled chicken breast', group: 'protein', portion: '1 palm', kcal: 165, protein: 31 },
  { id: 'tawook_palm', name: 'Chicken tawook', group: 'protein', portion: '1 palm', kcal: 170, protein: 28 },
  { id: 'rotisserie_palm', name: 'Rotisserie chicken (no skin)', group: 'protein', portion: '1 palm', kcal: 150, protein: 27 },
  { id: 'thigh', name: 'Skinless chicken thigh', group: 'protein', portion: '1 piece', kcal: 180, protein: 22 },
  { id: 'kofta_palm', name: 'Lean kofta', group: 'protein', portion: '1 palm (2-3 fingers)', kcal: 220, protein: 24 },
  { id: 'mince_palm', name: 'Lean mince stew', group: 'protein', portion: '1 palm', kcal: 210, protein: 26 },
  { id: 'liver_palm', name: 'Liver (kebda)', group: 'protein', portion: '1 palm', kcal: 150, protein: 24 },
  { id: 'egg', name: 'Boiled egg', group: 'protein', portion: '1 piece', kcal: 70, protein: 6 },
  { id: 'yogurt_greek', name: 'Greek yogurt', group: 'protein', portion: '1 small tub', kcal: 110, protein: 16 },
  { id: 'yogurt_plain', name: 'Plain yogurt (zabadi)', group: 'protein', portion: '1/2 cup', kcal: 80, protein: 5 },
  { id: 'cottage', name: 'Cottage cheese (areeshi)', group: 'protein', portion: '1/2 cup', kcal: 90, protein: 14 },
  { id: 'white_cheese', name: 'Low-fat white cheese', group: 'protein', portion: '1 matchbox', kcal: 60, protein: 6 },
  // Carbs: fists, pieces, spoons
  { id: 'rice', name: 'Rice', group: 'carb', portion: '1 fist', kcal: 160, protein: 3 },
  { id: 'baladi_half', name: 'Baladi bread', group: 'carb', portion: '1/2 loaf', kcal: 150, protein: 5 },
  { id: 'koshari', name: 'Light koshari', group: 'carb', portion: '1 fist', kcal: 190, protein: 6 },
  { id: 'pasta', name: 'Pasta (macarona)', group: 'carb', portion: '1 fist', kcal: 170, protein: 6 },
  { id: 'potato', name: 'Boiled potato', group: 'carb', portion: '1 fist (1 medium)', kcal: 110, protein: 3 },
  { id: 'sweet_potato', name: 'Sweet potato (batata)', group: 'carb', portion: '1 fist (1 medium)', kcal: 115, protein: 2 },
  { id: 'foul', name: 'Foul medames', group: 'carb', portion: '1 fist', kcal: 150, protein: 8 },
  { id: 'lentils', name: 'Lentils (adas)', group: 'carb', portion: '1 fist', kcal: 150, protein: 11 },
  { id: 'oats', name: 'Oats', group: 'carb', portion: '5 tbsp', kcal: 150, protein: 5 },
  { id: 'taameya', name: 'Ta’ameya (baked or air-fried)', group: 'carb', portion: '2 pieces', kcal: 160, protein: 8 },
  { id: 'banana', name: 'Banana', group: 'carb', portion: '1 piece', kcal: 105, protein: 1 },
  { id: 'fruit', name: 'Apple or orange', group: 'carb', portion: '1 piece', kcal: 80, protein: 0 },
  { id: 'dates', name: 'Dates', group: 'carb', portion: '3 pieces', kcal: 200, protein: 2 },
  // Veg: cupped hands
  { id: 'salad', name: 'Salad (cucumber, tomato, lettuce)', group: 'veg', portion: '1 cupped hand', kcal: 20, protein: 1 },
  { id: 'cooked_veg', name: 'Cooked vegetables (zucchini, beans, okra)', group: 'veg', portion: '1 cupped hand', kcal: 45, protein: 2 },
  { id: 'molokhia', name: 'Molokhia', group: 'veg', portion: '1 cupped hand', kcal: 60, protein: 4 },
  // Fats: thumbs, spoons
  { id: 'oil', name: 'Olive or vegetable oil', group: 'fat', portion: '1 thumb (1 tsp)', kcal: 40, protein: 0 },
  { id: 'tahini', name: 'Tahini', group: 'fat', portion: '1 thumb (1/2 tbsp)', kcal: 45, protein: 2 },
  { id: 'nuts', name: 'Nuts or peanuts', group: 'fat', portion: '1 thumb (6-8 nuts)', kcal: 45, protein: 2 },
  { id: 'ghee', name: 'Ghee or butter', group: 'fat', portion: '1 thumb (1 tsp)', kcal: 40, protein: 0 },
  // Shakes and drinks
  { id: 'whey_water', name: 'Protein shake (in water)', group: 'shake', portion: '1 scoop', kcal: 120, protein: 24 },
  { id: 'whey_milk', name: 'Protein shake (in milk)', group: 'shake', portion: '1 scoop + 1 cup half-fat milk', kcal: 220, protein: 32 },
  { id: 'milk', name: 'Half-fat milk', group: 'shake', portion: '1 cup', kcal: 100, protein: 8 },
];

export function getFood(id: string): FoodDef | undefined {
  return FOODS.find((f) => f.id === id);
}

/** Big one-tap buttons on the protein tracker. */
export const PROTEIN_QUICK: string[] = ['chicken_palm', 'whey_water', 'egg', 'yogurt_greek'];
