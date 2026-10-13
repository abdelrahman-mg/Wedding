// App data model. Everything the app persists lives in AppData.
import type { DayMeals, DayOfWeek } from '../data/plan';
import type { Slot } from '../data/meals';
import type { SessionKey } from '../data/sessions';

export type ISODate = string; // YYYY-MM-DD in local time

export interface Profile {
  name: string;
  heightCm: number;
  startWeight: number;
  startWaist: number;
  bodyFatEst: number;
  age: number;
  startDate: ISODate | null;
  onboarded: boolean;
}

export type ReminderId =
  | 'weighin'
  | 'meal_B'
  | 'meal_M'
  | 'meal_L'
  | 'meal_D'
  | 'meal_N'
  | 'gym'
  | 'checkin'
  | 'bedtime'
  | 'review'
  | 'prep_fri'
  | 'prep_tue'
  | 'water';

export interface ReminderSetting {
  enabled: boolean;
  time: string; // HH:MM
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  /** Color scheme id (see THEMES in ui/theme). */
  palette: string;
  arabic: boolean;
  units: 'metric' | 'imperial';
  reminders: Record<ReminderId, ReminderSetting>;
  snoozeUntil: number | null; // epoch ms
  healthConnect: boolean;
  demoMode: boolean;
  /** "Doctor reviewed my labs and BP" confirmed in Settings: relaxes hard limits. */
  doctorCleared: boolean;
  holidayWeeks: ISODate[]; // week-start (Sunday) dates
  legExtensionOptIn: boolean;
  aiEnabled: boolean;
  /** Body parts paused after repeated pain flags, until the user confirms clearance. */
  restricted: { shoulder: boolean; knee: boolean };
  reduceMotion: boolean;
}

export interface PlanState {
  meals: Record<DayOfWeek, DayMeals>;
  sessionDays: Record<DayOfWeek, SessionKey | null>;
  treatDay: DayOfWeek;
  /** Permanent exercise swaps: original exercise id -> name used. */
  exerciseSwaps: Record<string, string>;
}

export interface Adjustments {
  stepsAdjust: number;
  kcalAdjust: number;
  cardioAdjust: number;
  proteinTarget: number;
  deloadUntil: ISODate | null;
  /** Extra kcal applied while a triggered deload is active. */
  deloadKcal: number;
  /** Optional manual base kcal overrides (null = computed from the plan). */
  baseKcalGym: number | null;
  baseKcalRest: number | null;
}

export type MealStatus = 'eaten' | 'planB' | 'custom' | 'skipped';

export interface MealLog {
  status: MealStatus;
  mealId?: string; // planned meal for 'eaten', replacement for 'planB'
  custom?: { name: string; kcal: number; protein: number; photo?: string; treat?: boolean };
}

export type WorkoutKind = 'full' | 'minimum' | 'walk';

export interface DayLog {
  meals: Partial<Record<Slot, MealLog>>;
  steps?: number;
  water: number;
  sleep?: number;
  energy?: number;
  hunger?: number;
  oilMeasured?: boolean;
  oilTsp?: number;
  note?: string;
  cardioMinutes?: number;
  cardioType?: string;
  /** Session moved onto this day ("Do bench day today instead"), or 'skip'. */
  sessionOverride?: SessionKey | 'skip';
  cravings?: number;
  /** Optional 20-minute walk after lifting (bonus points). */
  postLiftWalk?: boolean;
  /** Food eaten outside the planned meal slots (snacks, extras). */
  extras?: ExtraFood[];
  checkinDone?: boolean;
  morningSeen?: boolean;
  /** Busy day / minimum effort mode: 3 simple meals plus the protein target. */
  busy?: boolean;
}

export interface BodyEntry {
  weight?: number;
  waist?: number;
}

export interface BpEntry {
  id: string;
  date: ISODate;
  systolic: number;
  diastolic: number;
  pulse?: number;
  time: 'morning' | 'evening';
  symptoms?: boolean;
}

export interface SetLog {
  exerciseId: string; // original slot id in the session
  nameUsed: string; // exercise name actually performed (alt name if swapped)
  setIndex: number;
  weight: number | null;
  reps: number | null; // seconds for timed exercises
  rir: number | null; // legacy field, no longer asked
  /** Form was clean on this set. Missing/null counts as clean. */
  clean?: boolean | null;
  done: boolean;
}

export interface WorkoutLog {
  id: string;
  date: ISODate;
  sessionKey: SessionKey;
  kind: WorkoutKind;
  startedAt: number;
  durationMin: number;
  feel?: number;
  deload: boolean;
  sets: SetLog[];
  finished: boolean;
  prs?: string[];
}

export interface PainFlag {
  id: string;
  date: ISODate;
  bodyPart: 'shoulder' | 'knee' | 'back' | 'other';
  note?: string;
  exercise?: string;
}

export type ChangeType = 'stepsAdjust' | 'kcalAdjust' | 'cardioAdjust' | 'proteinTarget' | 'deloadUntil' | 'baseKcalGym' | 'baseKcalRest';

export interface PlanChange {
  id: string;
  date: ISODate;
  type: ChangeType;
  old: number | string | null;
  new: number | string | null;
  reason: string;
  undone?: boolean;
}

export interface Photo {
  id: string;
  date: ISODate;
  uri: string;
  angle: 'front' | 'side' | 'back';
  week: number;
}

export interface StrengthTest {
  date: ISODate;
  pushups: number | null;
  legPress10: number | null;
  row10: number | null;
  plankSecs: number | null;
}

export interface RedFlagEntry {
  id: string;
  date: ISODate;
  symptom: string;
}

export interface ExtraFood {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  time: number; // epoch ms
  treat?: boolean;
  /** Logged by portion: food id from data/foods and how many portions. kcal/protein are totals. */
  foodId?: string;
  qty?: number;
}

export type EntryKind = 'weight' | 'waist' | 'steps' | 'sleep' | 'energy' | 'hunger' | 'water' | 'cardio' | 'bp' | 'note' | 'food';

/** One submitted input, shown in the Log feed. The field it changed lives in dayLogs/body/bp as before. */
export interface LogEntry {
  id: string;
  date: ISODate;
  time: number; // epoch ms
  kind: EntryKind;
  value: number | null;
  text: string;
  /** For undo: the field value before this entry, or the id of the record it created. */
  prev?: number | null;
  ref?: string;
}

export interface AppData {
  schemaVersion: number;
  profile: Profile;
  settings: Settings;
  plan: PlanState;
  adjust: Adjustments;
  dayLogs: Record<ISODate, DayLog>;
  body: Record<ISODate, BodyEntry>;
  bp: BpEntry[];
  workouts: WorkoutLog[];
  painFlags: PainFlag[];
  planChanges: PlanChange[];
  dismissed: Record<string, ISODate>;
  badges: Record<string, ISODate>;
  photos: Photo[];
  checklist: Record<string, { done: boolean; date: ISODate | null }>;
  messageHistory: Record<ISODate, number>;
  strengthTests: { baseline: StrengthTest | null; final: StrengthTest | null };
  redFlags: RedFlagEntry[];
  shoppingChecked: { weekStart: ISODate | null; items: Record<string, boolean> };
  seenCards: Record<string, boolean>;
  celebrations: Record<string, boolean>;
  planBCount: number;
  coachChat: { role: 'user' | 'coach'; text: string; date: number }[];
  entries: LogEntry[];
}
