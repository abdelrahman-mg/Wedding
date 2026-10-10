// Static guide content: ingredient Plan B, shopping, meal prep, eating out, supplements, labs.

export const INGREDIENT_PLAN_B: { missing: string; use: string }[] = [
  { missing: 'Chicken breast', use: 'Skinless thighs, tawook, lean kofta, or 3 eggs per palm' },
  { missing: 'Greek yogurt cup', use: '1 cup low-fat laban, or 1/2 cup cottage cheese' },
  { missing: 'Whey protein', use: '3 eggs, or a second Greek yogurt cup' },
  { missing: 'Baladi bread (1 loaf)', use: '1 cup cooked rice, 1 large sweet potato, or 1 cup cooked pasta or freekeh' },
  { missing: 'Sweet potato', use: '1 boiled potato (medium) or 3/4 cup rice' },
  { missing: 'Foul (1 cup)', use: '1 cup lentils, chickpeas or white beans' },
  { missing: 'Molokhia', use: 'Okra stew or spinach stew with the same chicken portion' },
  { missing: 'Oats', use: '1 baladi loaf, or freekeh' },
  { missing: 'Low-fat white cheese', use: '1/2 cup cottage cheese' },
  { missing: 'Eggs', use: '1 palm chicken, or 1 Greek yogurt cup plus 1 scoop whey' },
  { missing: 'Oven', use: 'Grill pan or air fryer, same oil rule (1 tsp)' },
  { missing: 'No time to cook', use: 'Emergency meals (E1-E5)' },
];

export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  /** Per-meal usage, used to rescale when the plan changes. */
  unit?: string;
  perWeekDefault?: number;
}

export const DEFAULT_SHOPPING: ShoppingItem[] = [
  { id: 'chicken_breast', name: 'Chicken breast', qty: '1.4 kg' },
  { id: 'chicken_thighs', name: 'Chicken thighs, skinless', qty: 'about 1 kg with bone' },
  { id: 'beef', name: 'Lean ground beef', qty: '500 g' },
  { id: 'eggs', name: 'Eggs', qty: '24', unit: 'eggs', perWeekDefault: 24 },
  { id: 'yogurt', name: 'Greek yogurt', qty: 'about 13 cups (2.2 kg)', unit: 'cups', perWeekDefault: 13 },
  { id: 'cottage', name: 'Cottage cheese', qty: '250 g' },
  { id: 'white_cheese', name: 'Low-fat white cheese and cheese triangles', qty: '1 small pack each' },
  { id: 'milk', name: 'Half-fat milk', qty: '1 L' },
  { id: 'whey', name: 'Whey', qty: '7 scoops/week', unit: 'scoops', perWeekDefault: 7 },
  { id: 'bread', name: 'Baladi bread', qty: '6 loaves', unit: 'loaves', perWeekDefault: 6 },
  { id: 'rice', name: 'Rice', qty: '1 kg pack' },
  { id: 'foul', name: 'Foul', qty: '1 can' },
  { id: 'lentils', name: 'Lentils', qty: '500 g' },
  { id: 'oats', name: 'Oats', qty: '500 g' },
  { id: 'sweet_potato', name: 'Sweet potatoes', qty: '2 large', unit: 'large', perWeekDefault: 2 },
  { id: 'bananas', name: 'Bananas', qty: '7', unit: '', perWeekDefault: 7 },
  { id: 'apples', name: 'Apples', qty: '5', unit: '', perWeekDefault: 5 },
  { id: 'tomatoes', name: 'Tomatoes', qty: '2 kg' },
  { id: 'cucumbers', name: 'Cucumbers', qty: '1.5 kg' },
  { id: 'lettuce', name: 'Lettuce or rocca', qty: '2 bunches' },
  { id: 'greens', name: 'Zucchini, green beans or okra', qty: '1.5 kg' },
  { id: 'peppers', name: 'Bell peppers', qty: '4' },
  { id: 'onions', name: 'Onions', qty: '1 kg' },
  { id: 'carrots', name: 'Carrots', qty: '4' },
  { id: 'molokhia', name: 'Molokhia, frozen', qty: '1 pack' },
  { id: 'garlic', name: 'Garlic', qty: '1 head' },
  { id: 'lemons', name: 'Lemons', qty: '8' },
  { id: 'oil', name: 'Oil', qty: '1 bottle (max about 4 tsp/day)' },
  { id: 'pantry', name: 'Honey, cumin, spices, tea, coffee', qty: '' },
  { id: 'popcorn', name: 'Popcorn kernels', qty: '1 small pack' },
];

export const MEAL_PREP = [
  {
    id: 'fri',
    title: 'Friday morning (covers Fri-Mon)',
    steps: [
      'Grill or roast 700 g chicken breast',
      'Cook 3 cups rice',
      'Boil 12 eggs',
      'Chop salad vegetables',
      'Roast vegetables and sweet potatoes',
      'Make lentil soup',
    ],
  },
  {
    id: 'tue',
    title: 'Tuesday evening (covers Tue-Thu and Saturday)',
    steps: [
      'Cook remaining chicken, thighs and kofta',
      'Cook 2 cups rice',
      'Boil 8 eggs',
      'Prep the tawook marinade',
    ],
  },
];

export const MEAL_PREP_STORAGE =
  'Portion into containers by palm and cup. Fridge 3-4 days. Freezer up to 1 month for chicken, kofta, soup and bread.';

export const EATING_OUT_RULES = [
  'One planned treat per week.',
  'Crepe: 1 savory chicken crepe, light sauce, no fries.',
  'Pizza: 2 thin-crust slices, big salad first.',
  'Protein first, then water, and the next meal is normal. Never skip meals to "make up" for it.',
  'Delivery default: grilled chicken or kebab plate, rice or bread (not both), salad, no fries or extra sauce.',
  'Social events: a palm of protein, a fist of carbs, lots of vegetables, two plates maximum.',
];

export const SUPPLEMENTS: { id: string; name: string; verdict: 'useful' | 'optional' | 'locked' | 'avoid' | 'test'; text: string }[] = [
  { id: 'whey', name: 'Whey protein', verdict: 'useful', text: 'Useful and optional. Buy an authentic brand from a trusted seller. It is just food: an easy 24 g of protein.' },
  { id: 'creatine', name: 'Creatine monohydrate 3-5 g/day', verdict: 'locked', text: 'Good evidence, optional. Expect 1-2 kg of water weight on the scale (not fat). Unlocks only after kidney labs are done and normal.' },
  { id: 'caffeine', name: 'Caffeine', verdict: 'optional', text: 'Up to 2-3 coffees a day, none after 3 pm. No pre-workout powders until a doctor has checked your blood pressure.' },
  { id: 'vitd', name: 'Vitamin D', verdict: 'test', text: 'Test first, then supplement only if your doctor says you are low.' },
  { id: 'fishoil', name: 'Fish oil', verdict: 'optional', text: 'Not needed for this plan.' },
  { id: 'burners', name: 'Fat burners, detox teas, "insulin" supplements', verdict: 'avoid', text: 'Avoid. They do not work and some are risky with high blood pressure.' },
];

export interface ChecklistDef {
  id: string;
  label: string;
  group: 'doctor' | 'labs' | 'other';
}

export const HEALTH_CHECKLIST: ChecklistDef[] = [
  { id: 'doctor_bp', label: 'Doctor checked my blood pressure', group: 'doctor' },
  { id: 'bp_cuff', label: 'I have a home BP cuff', group: 'other' },
  { id: 'lab_glucose', label: 'Fasting glucose', group: 'labs' },
  { id: 'lab_hba1c', label: 'HbA1c', group: 'labs' },
  { id: 'lab_lipids', label: 'Lipid profile', group: 'labs' },
  { id: 'lab_liver', label: 'ALT / AST (liver)', group: 'labs' },
  { id: 'lab_creatinine', label: 'Creatinine (kidney)', group: 'labs' },
  { id: 'lab_vitd', label: 'Vitamin D', group: 'labs' },
  { id: 'kidney_normal', label: 'Kidney labs done and normal', group: 'labs' },
  { id: 'snoring_discussed', label: 'Discussed snoring / sleep study with a doctor', group: 'doctor' },
  { id: 'doctor_reviewed', label: 'Doctor reviewed my labs and BP', group: 'doctor' },
];

export const DISCLAIMER =
  'This app is not medical advice. It is a training and nutrition plan built for MG. Get your blood pressure, blood tests and snoring checked by a doctor. Stop exercising and seek care for chest pain, fainting, severe dizziness, unusual breathlessness or palpitations.';

export const KNEE_SAFETY = 'If the knee gives way, swells or hurts, stop and see a doctor.';

export const RED_FLAGS = [
  { id: 'chest', label: 'Chest pain or pressure', emergency: true },
  { id: 'faint', label: 'Fainting', emergency: true },
  { id: 'dizzy', label: 'Severe dizziness', emergency: false },
  { id: 'breath', label: 'Unusual breathlessness', emergency: false },
  { id: 'palp', label: 'Palpitations', emergency: false },
  { id: 'headache', label: 'Severe headache', emergency: false },
] as const;

export const EMERGENCY_NUMBER_EGYPT = '123';

export const CRAVING_ROUTINE = [
  'Drink a full glass of water.',
  'Walk for 10 minutes, or step away from the kitchen and the phone.',
  'Still hungry after 10 minutes? Eat your next planned snack early. That is the plan working, not cheating.',
];

/**
 * Countable ingredients per meal (from the meal descriptions), used to rescale the
 * shopping list when the weekly plan is edited. Non-countable items keep the default.
 */
export const MEAL_COUNTS: Record<string, Partial<Record<'eggs' | 'yogurt' | 'whey' | 'bread' | 'bananas' | 'apples' | 'sweet_potato', number>>> = {
  B1: { eggs: 2, bread: 0.5 },
  B2: { eggs: 3, bread: 0.5, yogurt: 1 },
  B3: { whey: 1, bananas: 1 },
  B4: { eggs: 2, bread: 1 },
  M1: { yogurt: 1, apples: 1 },
  M2: { eggs: 2 },
  M3: { whey: 1, apples: 1 },
  L1: {},
  L2: { yogurt: 0.5 },
  L3: {},
  L4: {},
  L5: { bread: 0.5 },
  T: {},
  PG: { bananas: 1 },
  D1: { sweet_potato: 1 },
  D2: { bread: 0.5, yogurt: 1 },
  D3: { eggs: 3, bread: 0.5 },
  D4: { bread: 0.5, yogurt: 0.25 },
  D5: { eggs: 2, bread: 0.5 },
  N1: { yogurt: 1 },
  N2: { whey: 1, yogurt: 1 },
  N3: { eggs: 1 },
  N4: { yogurt: 1, bananas: 0.5 },
};
