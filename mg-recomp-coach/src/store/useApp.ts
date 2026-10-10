import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Slot } from '../data/meals';
import type { DayOfWeek } from '../data/plan';
import type { SessionKey } from '../data/sessions';
import { defaultData, defaultPlan, migrate, SCHEMA_VERSION } from '../engine/defaults';
import { weekStart } from '../engine/dates';
import type { Proposal } from '../engine/rules';
import type {
  AppData,
  BpEntry,
  ChangeType,
  DayLog,
  ISODate,
  MealLog,
  PainFlag,
  PlanChange,
  Profile,
  ReminderId,
  ReminderSetting,
  SetLog,
  Settings,
  StrengthTest,
  WorkoutKind,
  WorkoutLog,
} from '../engine/types';

export const STORAGE_KEY = 'mg-recomp-coach';
export const REAL_BACKUP_KEY = 'mg-recomp-coach-real-backup';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export interface RestTimer {
  endsAt: number;
  total: number;
  label: string;
}

interface Store {
  data: AppData;
  active: WorkoutLog | null;
  hydrated: boolean;
  restTimer: RestTimer | null;

  // generic
  setData: (fn: (d: AppData) => AppData) => void;
  replaceData: (d: AppData) => void;
  resetAll: () => void;

  // profile & settings
  completeOnboarding: (p: Partial<Profile>, startDate: ISODate) => void;
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setReminder: (id: ReminderId, r: Partial<ReminderSetting>) => void;

  // day logs
  updateDay: (date: ISODate, patch: Partial<DayLog>) => void;
  setMeal: (date: ISODate, slot: Slot, entry: MealLog | null) => void;
  addWater: (date: ISODate, delta: number) => void;
  setBody: (date: ISODate, patch: { weight?: number | null; waist?: number | null }) => void;
  addBp: (e: Omit<BpEntry, 'id'>) => void;
  removeBp: (id: string) => void;
  addPain: (p: Omit<PainFlag, 'id'>) => void;
  addRedFlag: (date: ISODate, symptom: string) => void;

  // workouts
  startWorkout: (date: ISODate, sessionKey: SessionKey, kind: WorkoutKind, deload: boolean) => void;
  upsertSet: (s: SetLog) => void;
  finishWorkout: (patch: Partial<WorkoutLog>) => WorkoutLog | null;
  cancelWorkout: () => void;
  logWalk: (date: ISODate) => void;
  deleteWorkout: (id: string) => void;
  setRestTimer: (t: RestTimer | null) => void;

  // coach
  applyChange: (type: ChangeType, value: number | string | null, reason: string, date: ISODate) => void;
  applyProposal: (p: Proposal, date: ISODate) => void;
  dismiss: (id: string, date: ISODate) => void;
  undoLastChange: () => void;

  // plan
  setPlanMeal: (dow: DayOfWeek, slot: Exclude<Slot, 'PG'>, mealId: string) => void;
  moveTreat: (dow: DayOfWeek) => void;
  setSessionDay: (dow: DayOfWeek, key: SessionKey | null) => void;
  swapExercise: (id: string, name: string | null) => void;
  resetPlan: () => void;

  // misc
  toggleChecklist: (id: string, date: ISODate) => void;
  awardBadges: (ids: string[], date: ISODate) => void;
  addPhoto: (p: { uri: string; angle: 'front' | 'side' | 'back'; week: number; date: ISODate }) => void;
  removePhoto: (id: string) => void;
  setStrengthTest: (which: 'baseline' | 'final', t: StrengthTest) => void;
  toggleShopping: (id: string, today: ISODate) => void;
  setMessageIndex: (date: ISODate, idx: number) => void;
  markSeen: (key: string) => void;
  celebrate: (key: string) => void;
  incPlanB: () => void;
  addChat: (role: 'user' | 'coach', text: string) => void;
  clearChat: () => void;
  toggleHoliday: (sunday: ISODate) => void;
}

const emptyDay = (): DayLog => ({ meals: {}, water: 0 });

export const useApp = create<Store>()(
  persist(
    (set, get) => {
      const mut = (fn: (d: AppData) => AppData) => set((s) => ({ data: fn(s.data) }));
      const day = (d: AppData, date: ISODate): DayLog => d.dayLogs[date] ?? emptyDay();

      return {
        data: defaultData(),
        active: null,
        hydrated: false,
        restTimer: null,

        setData: mut,
        replaceData: (d) => set({ data: migrate(d), active: null }),
        resetAll: () => set({ data: defaultData(), active: null, restTimer: null }),

        completeOnboarding: (p, startDate) =>
          mut((d) => ({ ...d, profile: { ...d.profile, ...p, startDate, onboarded: true } })),
        setProfile: (p) => mut((d) => ({ ...d, profile: { ...d.profile, ...p } })),
        setSettings: (s) => mut((d) => ({ ...d, settings: { ...d.settings, ...s } })),
        setReminder: (id, r) =>
          mut((d) => ({
            ...d,
            settings: { ...d.settings, reminders: { ...d.settings.reminders, [id]: { ...d.settings.reminders[id], ...r } } },
          })),

        updateDay: (date, patch) => mut((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: { ...day(d, date), ...patch } } })),
        setMeal: (date, slot, entry) =>
          mut((d) => {
            const cur = day(d, date);
            const meals = { ...cur.meals };
            if (entry) meals[slot] = entry;
            else delete meals[slot];
            return { ...d, dayLogs: { ...d.dayLogs, [date]: { ...cur, meals } } };
          }),
        addWater: (date, delta) =>
          mut((d) => {
            const cur = day(d, date);
            return { ...d, dayLogs: { ...d.dayLogs, [date]: { ...cur, water: Math.max(0, Math.min(20, cur.water + delta)) } } };
          }),
        setBody: (date, patch) =>
          mut((d) => {
            const cur = { ...(d.body[date] ?? {}) };
            if ('weight' in patch) {
              if (patch.weight == null) delete cur.weight;
              else cur.weight = patch.weight;
            }
            if ('waist' in patch) {
              if (patch.waist == null) delete cur.waist;
              else cur.waist = patch.waist;
            }
            const body = { ...d.body };
            if (cur.weight == null && cur.waist == null) delete body[date];
            else body[date] = cur;
            return { ...d, body };
          }),
        addBp: (e) => mut((d) => ({ ...d, bp: [...d.bp, { ...e, id: uid() }] })),
        removeBp: (id) => mut((d) => ({ ...d, bp: d.bp.filter((b) => b.id !== id) })),
        addPain: (p) => mut((d) => ({ ...d, painFlags: [...d.painFlags, { ...p, id: uid() }] })),
        addRedFlag: (date, symptom) => mut((d) => ({ ...d, redFlags: [...d.redFlags, { id: uid(), date, symptom }] })),

        startWorkout: (date, sessionKey, kind, deload) =>
          set({
            active: { id: uid(), date, sessionKey, kind, deload, startedAt: Date.now(), durationMin: 0, sets: [], finished: false },
          }),
        upsertSet: (s) =>
          set((st) => {
            if (!st.active) return {};
            const sets = st.active.sets.filter((x) => !(x.exerciseId === s.exerciseId && x.setIndex === s.setIndex));
            sets.push(s);
            return { active: { ...st.active, sets } };
          }),
        finishWorkout: (patch) => {
          const a = get().active;
          if (!a) return null;
          const w: WorkoutLog = {
            ...a,
            ...patch,
            sets: a.sets.filter((s) => s.done),
            durationMin: Math.max(1, Math.round((Date.now() - a.startedAt) / 60000)),
            finished: true,
          };
          set((st) => ({ active: null, restTimer: null, data: { ...st.data, workouts: [...st.data.workouts, w] } }));
          return w;
        },
        cancelWorkout: () => set({ active: null, restTimer: null }),
        logWalk: (date) =>
          mut((d) => ({
            ...d,
            workouts: [
              ...d.workouts,
              { id: uid(), date, sessionKey: 'MINIMUM', kind: 'walk', deload: false, startedAt: Date.now(), durationMin: 30, sets: [], finished: true },
            ],
          })),
        deleteWorkout: (id) => mut((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })),
        setRestTimer: (t) => set({ restTimer: t }),

        applyChange: (type, value, reason, date) =>
          mut((d) => {
            const old = (d.adjust as any)[type] ?? null;
            const change: PlanChange = { id: uid(), date, type, old, new: value, reason };
            return { ...d, adjust: { ...d.adjust, [type]: value }, planChanges: [...d.planChanges, change] };
          }),
        applyProposal: (p, date) => {
          for (const a of p.apply) get().applyChange(a.type, a.value, p.title + ': ' + p.reason, date);
          mut((d) => ({ ...d, dismissed: { ...d.dismissed, [p.id]: date } }));
        },
        dismiss: (id, date) => mut((d) => ({ ...d, dismissed: { ...d.dismissed, [id]: date } })),
        undoLastChange: () =>
          mut((d) => {
            const idx = [...d.planChanges].reverse().findIndex((c) => !c.undone);
            if (idx < 0) return d;
            const real = d.planChanges.length - 1 - idx;
            const c = d.planChanges[real];
            const planChanges = d.planChanges.map((x, i) => (i === real ? { ...x, undone: true } : x));
            return { ...d, adjust: { ...d.adjust, [c.type]: c.old }, planChanges };
          }),

        setPlanMeal: (dow, slot, mealId) =>
          mut((d) => ({ ...d, plan: { ...d.plan, meals: { ...d.plan.meals, [dow]: { ...d.plan.meals[dow], [slot]: mealId } } } })),
        moveTreat: (dow) =>
          mut((d) => {
            const meals = { ...d.plan.meals };
            const from = d.plan.treatDay;
            // Put the default lunch of the "to" day onto the old treat day, then set T.
            const swapped = meals[dow].L ?? 'L1';
            meals[from] = { ...meals[from], L: swapped === 'T' ? 'L1' : swapped };
            meals[dow] = { ...meals[dow], L: 'T' };
            return { ...d, plan: { ...d.plan, meals, treatDay: dow } };
          }),
        setSessionDay: (dow, key) =>
          mut((d) => ({ ...d, plan: { ...d.plan, sessionDays: { ...d.plan.sessionDays, [dow]: key } } })),
        swapExercise: (id, name) =>
          mut((d) => {
            const exerciseSwaps = { ...d.plan.exerciseSwaps };
            if (name) exerciseSwaps[id] = name;
            else delete exerciseSwaps[id];
            return { ...d, plan: { ...d.plan, exerciseSwaps } };
          }),
        resetPlan: () => mut((d) => ({ ...d, plan: defaultPlan() })),

        toggleChecklist: (id, date) =>
          mut((d) => {
            const cur = d.checklist[id] ?? { done: false, date: null };
            return { ...d, checklist: { ...d.checklist, [id]: { done: !cur.done, date: !cur.done ? date : null } } };
          }),
        awardBadges: (ids, date) =>
          mut((d) => ({ ...d, badges: { ...d.badges, ...Object.fromEntries(ids.map((i) => [i, date])) } })),
        addPhoto: (p) => mut((d) => ({ ...d, photos: [...d.photos, { ...p, id: uid() }] })),
        removePhoto: (id) => mut((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) })),
        setStrengthTest: (which, t) => mut((d) => ({ ...d, strengthTests: { ...d.strengthTests, [which]: t } })),
        toggleShopping: (id, today) =>
          mut((d) => {
            const ws = weekStart(today);
            const items = d.shoppingChecked.weekStart === ws ? { ...d.shoppingChecked.items } : {};
            items[id] = !items[id];
            return { ...d, shoppingChecked: { weekStart: ws, items } };
          }),
        setMessageIndex: (date, idx) => mut((d) => ({ ...d, messageHistory: { ...d.messageHistory, [date]: idx } })),
        markSeen: (key) => mut((d) => ({ ...d, seenCards: { ...d.seenCards, [key]: true } })),
        celebrate: (key) => mut((d) => ({ ...d, celebrations: { ...d.celebrations, [key]: true } })),
        incPlanB: () => mut((d) => ({ ...d, planBCount: d.planBCount + 1 })),
        addChat: (role, text) => mut((d) => ({ ...d, coachChat: [...d.coachChat.slice(-40), { role, text, date: Date.now() }] })),
        clearChat: () => mut((d) => ({ ...d, coachChat: [] })),
        toggleHoliday: (sunday) =>
          mut((d) => {
            const has = d.settings.holidayWeeks.includes(sunday);
            const holidayWeeks = has ? d.settings.holidayWeeks.filter((w) => w !== sunday) : [...d.settings.holidayWeeks, sunday];
            return { ...d, settings: { ...d.settings, holidayWeeks } };
          }),
      };
    },
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ data: s.data, active: s.active }),
      migrate: (persisted: any) => ({ ...persisted, data: migrate(persisted?.data) }),
      merge: (persisted: any, current) => ({
        ...current,
        data: migrate(persisted?.data ?? current.data),
        active: persisted?.active ?? null,
      }),
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
      },
    },
  ),
);

/** Demo mode: stash the real data, load fake logs; turning it off restores the real data untouched. */
export async function enableDemo(demo: AppData) {
  const real = useApp.getState().data;
  await AsyncStorage.setItem(REAL_BACKUP_KEY, JSON.stringify(real));
  useApp.setState({ data: { ...demo, settings: { ...demo.settings, demoMode: true } }, active: null });
}

export async function disableDemo() {
  const raw = await AsyncStorage.getItem(REAL_BACKUP_KEY);
  const real = raw ? migrate(JSON.parse(raw)) : useApp.getState().data;
  useApp.setState({ data: { ...real, settings: { ...real.settings, demoMode: false } }, active: null });
  await AsyncStorage.removeItem(REAL_BACKUP_KEY);
}
