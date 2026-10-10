// Initial app data and the versioned migration system.
import { HEALTH_CHECKLIST } from '../data/guides';
import { NUTRITION } from '../data/phases';
import { DEFAULT_MEAL_PLAN, DEFAULT_SESSION_DAYS, DEFAULT_TREAT_DAY } from '../data/plan';
import type { AppData, PlanState, ReminderId, ReminderSetting, Settings } from './types';

export const SCHEMA_VERSION = 2;

export const DEFAULT_REMINDERS: Record<ReminderId, ReminderSetting> = {
  weighin: { enabled: true, time: '07:30' },
  meal_B: { enabled: true, time: '08:00' },
  meal_M: { enabled: true, time: '11:30' },
  meal_L: { enabled: true, time: '14:30' },
  meal_D: { enabled: true, time: '20:30' },
  meal_N: { enabled: true, time: '22:30' },
  gym: { enabled: true, time: '17:00' },
  checkin: { enabled: true, time: '22:00' },
  bedtime: { enabled: true, time: '23:15' },
  review: { enabled: true, time: '20:00' },
  prep_fri: { enabled: true, time: '09:00' },
  prep_tue: { enabled: true, time: '18:00' },
  water: { enabled: false, time: '09:00' },
};

export function defaultPlan(): PlanState {
  return {
    meals: JSON.parse(JSON.stringify(DEFAULT_MEAL_PLAN)),
    sessionDays: { ...DEFAULT_SESSION_DAYS },
    treatDay: DEFAULT_TREAT_DAY,
    exerciseSwaps: {},
  };
}

export function defaultSettings(): Settings {
  return {
    theme: 'system',
    arabic: false,
    units: 'metric',
    reminders: JSON.parse(JSON.stringify(DEFAULT_REMINDERS)),
    snoozeUntil: null,
    healthConnect: false,
    demoMode: false,
    doctorCleared: false,
    holidayWeeks: [],
    legExtensionOptIn: false,
    aiEnabled: false,
    restricted: { shoulder: false, knee: false },
    reduceMotion: false,
  };
}

export function defaultData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      name: 'MG',
      heightCm: 175,
      startWeight: 110,
      startWaist: 115,
      bodyFatEst: 37,
      age: 26,
      startDate: null,
      onboarded: false,
    },
    settings: defaultSettings(),
    plan: defaultPlan(),
    adjust: {
      stepsAdjust: 0,
      kcalAdjust: 0,
      cardioAdjust: 0,
      proteinTarget: NUTRITION.proteinTarget,
      deloadUntil: null,
      deloadKcal: 150,
      baseKcalGym: null,
      baseKcalRest: null,
    },
    dayLogs: {},
    body: {},
    bp: [],
    workouts: [],
    painFlags: [],
    planChanges: [],
    dismissed: {},
    badges: {},
    photos: [],
    checklist: Object.fromEntries(HEALTH_CHECKLIST.map((c) => [c.id, { done: false, date: null }])),
    messageHistory: {},
    strengthTests: { baseline: null, final: null },
    redFlags: [],
    shoppingChecked: { weekStart: null, items: {} },
    seenCards: {},
    celebrations: {},
    planBCount: 0,
    coachChat: [],
  };
}

type Migration = (d: any) => any;

// Each migration upgrades from version N to N+1. Never edit an existing migration.
const MIGRATIONS: Record<number, Migration> = {
  // v1 -> v2: added coachChat, celebrations, restricted flags, reduceMotion.
  1: (d) => ({
    ...d,
    coachChat: d.coachChat ?? [],
    celebrations: d.celebrations ?? {},
    settings: {
      ...d.settings,
      restricted: d.settings?.restricted ?? { shoulder: false, knee: false },
      reduceMotion: d.settings?.reduceMotion ?? false,
    },
  }),
};

/** Upgrade any older persisted data and fill missing fields with defaults. */
export function migrate(raw: any): AppData {
  if (!raw || typeof raw !== 'object') return defaultData();
  let d = raw;
  let v: number = typeof d.schemaVersion === 'number' ? d.schemaVersion : 1;
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (m) d = m(d);
    v++;
  }
  const def = defaultData();
  const merged: AppData = {
    ...def,
    ...d,
    profile: { ...def.profile, ...d.profile },
    settings: { ...def.settings, ...d.settings, reminders: { ...def.settings.reminders, ...(d.settings?.reminders ?? {}) } },
    plan: { ...def.plan, ...d.plan },
    adjust: { ...def.adjust, ...d.adjust },
    checklist: { ...def.checklist, ...d.checklist },
    strengthTests: { ...def.strengthTests, ...d.strengthTests },
    schemaVersion: SCHEMA_VERSION,
  };
  return merged;
}
