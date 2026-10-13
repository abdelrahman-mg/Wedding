import type { Slot } from './meals';
import type { SessionKey } from './sessions';

// 0 = Sunday ... 6 = Saturday.
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Meals per day. PG is not stored here: it is added automatically on gym days.
export type DayMeals = Partial<Record<Exclude<Slot, 'PG'>, string>>;

export const DEFAULT_MEAL_PLAN: Record<DayOfWeek, DayMeals> = {
  0: { B: 'B3', M: 'M2', L: 'L1', D: 'D1', N: 'N4' },
  1: { B: 'B1', M: 'M1', L: 'L2', D: 'D4', N: 'N2' },
  2: { B: 'B2', M: 'M3', L: 'L4', D: 'D3', N: 'N4' },
  3: { B: 'B4', M: 'M3', L: 'L5', D: 'D2', N: 'N4' },
  4: { B: 'B1', M: 'M1', L: 'L3', D: 'D5', N: 'N2' },
  5: { B: 'B2', M: 'M2', L: 'L4', D: 'D1', N: 'N1' },
  6: { B: 'B3', M: 'M3', L: 'T', D: 'D4', N: 'N4' },
};

// Gym days are Tuesday (deadlift), Friday (squat) and Saturday (bench). Everything else is rest plus easy cardio.
export const DEFAULT_SESSION_DAYS: Record<DayOfWeek, SessionKey | null> = {
  0: null,
  1: null,
  2: 'DEADLIFT',
  3: null,
  4: null,
  5: 'SQUAT',
  6: 'BENCH',
};

export const DEFAULT_TREAT_DAY: DayOfWeek = 6;
export const CARDIO_DAYS: DayOfWeek[] = [0, 1, 3];

// Expected totals from the brief (used only as unit-test fixtures; the app computes them).
export const DAY_TOTAL_FIXTURES: Record<DayOfWeek, { kcal: number; protein: number }> = {
  0: { kcal: 1875, protein: 172 },
  1: { kcal: 1930, protein: 174 },
  2: { kcal: 1965, protein: 158 },
  3: { kcal: 1910, protein: 171 },
  4: { kcal: 1900, protein: 164 },
  5: { kcal: 1975, protein: 165 },
  6: { kcal: 2035, protein: 153 },
};
