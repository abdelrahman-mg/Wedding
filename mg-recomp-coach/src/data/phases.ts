// 12-week roadmap (section 3.2).

export type PhaseId = 1 | 2 | 3 | 4;
export type LiftingMode = 'easeIn' | 'full' | 'deload';

export interface WeekTarget {
  week: number;
  phase: PhaseId;
  steps: number;
  cardio: number;
  lifting: LiftingMode;
}

export const PHASES: Record<PhaseId, { name: string; weeks: string; note: string }> = {
  1: { name: 'Foundation', weeks: '1-2', note: 'Learning phase: light weights, focus on form.' },
  2: { name: 'Build', weeks: '3-6', note: 'Week 3 is still learning. Then add weight each session. Week 6 is a deload.' },
  3: { name: 'Push', weeks: '7-10', note: 'Full sets, push the progression.' },
  4: { name: 'Finish', weeks: '11-12', note: 'Week 12 deload plus the strength test.' },
};

export const WEEK_TARGETS: WeekTarget[] = [
  { week: 1, phase: 1, steps: 6000, cardio: 20, lifting: 'easeIn' },
  { week: 2, phase: 1, steps: 7500, cardio: 20, lifting: 'easeIn' },
  { week: 3, phase: 2, steps: 8000, cardio: 25, lifting: 'easeIn' },
  { week: 4, phase: 2, steps: 8500, cardio: 30, lifting: 'full' },
  { week: 5, phase: 2, steps: 9000, cardio: 35, lifting: 'full' },
  { week: 6, phase: 2, steps: 10000, cardio: 25, lifting: 'deload' },
  { week: 7, phase: 3, steps: 10000, cardio: 35, lifting: 'full' },
  { week: 8, phase: 3, steps: 10500, cardio: 40, lifting: 'full' },
  { week: 9, phase: 3, steps: 11000, cardio: 45, lifting: 'full' },
  { week: 10, phase: 3, steps: 11000, cardio: 45, lifting: 'full' },
  { week: 11, phase: 4, steps: 11000, cardio: 45, lifting: 'full' },
  { week: 12, phase: 4, steps: 12000, cardio: 30, lifting: 'deload' },
];

export const DELOAD_WEEKS = [6, 12];

export const NUTRITION = {
  maintenance: 2500,
  proteinTarget: 160,
  proteinMinOnPlan: 140,
  fatRange: '55-70 g',
  carbRange: '170-210 g',
  fiberMin: 30,
  waterGoalGlasses: 10,
  oilMaxTsp: 4,
  kcalFloor: 1700,
  onPlanKcalTolerance: 150,
};

export const HARD_LIMITS = {
  kcalFloor: 1700,
  kcalAdjustMin: -250,
  stepsMax: 12000,
  cardioMax: 45,
  cardioMin: 15,
  proteinMinAuto: 150,
};
