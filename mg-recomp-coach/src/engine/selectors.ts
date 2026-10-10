// Pure derivations from AppData. Screens and the rules engine both use these.
import { BADGES, type BadgeId } from '../data/badges';
import { DAILY_MESSAGES } from '../data/messages';
import { PHASES } from '../data/phases';
import { SESSIONS, type SessionKey } from '../data/sessions';
import { addDays, dayOfWeek, diffDays, programWeek, rangeDates, statsWeekNumber, weekDates, weekStart } from './dates';
import { dayKcalTarget, eatenTotals, planAverageKcal, plannedSlots, type PlannedSlot } from './nutrition';
import { isDeload, isTriggeredDeload } from './phase';
import { historyFor } from './progression';
import { countDroppingExercises, earlyDeloadCheck, weeklyReview, type ReviewResult, type WeekStats } from './rules';
import { computeStreaks, dayScore, isOnPlan, levelFor, type DayScore } from './scoring';
import { cardioTarget, stepTarget, weekTarget } from './targets';
import type { AppData, ISODate, WorkoutKind, WorkoutLog } from './types';

export interface DayContext {
  date: ISODate;
  dow: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  week: number; // program week (uncapped)
  roadmapWeek: number; // capped at 12
  phaseName: string;
  session: SessionKey | null;
  skipped: boolean;
  isGym: boolean;
  deload: boolean;
  holiday: boolean;
  stepTarget: number;
  cardioTarget: number;
  kcalTarget: number;
  proteinTarget: number;
  slots: PlannedSlot[];
  dayTypeLabel: string;
}

export function weekFor(data: AppData, date: ISODate): number {
  if (!data.profile.startDate) return 1;
  return Math.max(1, programWeek(data.profile.startDate, date));
}

export function dayContext(data: AppData, date: ISODate): DayContext {
  const dow = dayOfWeek(date);
  const week = weekFor(data, date);
  const rw = Math.min(12, week);
  const log = data.dayLogs[date];
  const override = log?.sessionOverride;
  const planned = data.plan.sessionDays[dow];
  const skipped = override === 'skip';
  const session: SessionKey | null = skipped ? null : override ? override : planned;
  const isGym = session != null;
  const deload = isDeload(rw, date, data.adjust.deloadUntil);
  const holiday = data.settings.holidayWeeks.includes(weekStart(date));
  const slots = plannedSlots(data.plan, dow, isGym);
  const triggeredDeload = isTriggeredDeload(date, data.adjust.deloadUntil);
  const kcalTarget = dayKcalTarget(data.plan, dow, { adjust: data.adjust, holiday, deloadActive: triggeredDeload }, isGym);
  const cap = data.settings.doctorCleared ? 15000 : 12000;
  const cardioMax = data.settings.doctorCleared ? 60 : 45;
  return {
    date,
    dow,
    week,
    roadmapWeek: rw,
    phaseName: PHASES[weekTarget(rw).phase].name,
    session,
    skipped,
    isGym,
    deload,
    holiday,
    stepTarget: stepTarget(rw, data.adjust.stepsAdjust, cap),
    cardioTarget: cardioTarget(rw, data.adjust.cardioAdjust, cardioMax),
    kcalTarget,
    proteinTarget: data.adjust.proteinTarget,
    slots,
    dayTypeLabel: session ? `Gym ${SESSIONS[session].name}` : skipped ? 'Gym skipped: rest + walk' : 'Rest + cardio',
  };
}

const KIND_RANK: Record<WorkoutKind, number> = { full: 3, minimum: 2, walk: 1 };

export function workoutKindOn(workouts: WorkoutLog[], date: ISODate): WorkoutKind | null {
  let best: WorkoutKind | null = null;
  for (const w of workouts) {
    if (w.date !== date || !w.finished) continue;
    if (!best || KIND_RANK[w.kind] > KIND_RANK[best]) best = w.kind;
  }
  return best;
}

export interface DaySummary {
  ctx: DayContext;
  score: DayScore;
  kcal: number;
  protein: number;
  onPlan: boolean;
  workout: WorkoutKind | null;
  logged: boolean;
}

export function daySummary(data: AppData, date: ISODate): DaySummary {
  const ctx = dayContext(data, date);
  const log = data.dayLogs[date];
  const eaten = eatenTotals(ctx.slots, log);
  const workout = workoutKindOn(data.workouts, date);
  const score = dayScore({
    plannedSlots: eaten.planned,
    mealsDone: eaten.done,
    overPenalties: eaten.overPenalties,
    isGymDay: ctx.isGym,
    workout,
    cardioMinutes: log?.cardioMinutes ?? 0,
    cardioTarget: ctx.cardioTarget,
    steps: log?.steps ?? 0,
    stepTarget: ctx.stepTarget,
    water: log?.water ?? 0,
    protein: eaten.protein,
    proteinTarget: ctx.proteinTarget,
    sleep: log?.sleep ?? null,
    weightLogged: data.body[date]?.weight != null,
    postLiftWalk: !!log?.postLiftWalk,
  });
  return {
    ctx,
    score,
    kcal: eaten.kcal,
    protein: eaten.protein,
    onPlan: isOnPlan(eaten.kcal, ctx.kcalTarget, eaten.protein, score.total),
    workout,
    logged: !!log,
  };
}

export function weekStats(data: AppData, sunday: ISODate): WeekStats {
  const dates = weekDates(sunday);
  const weights = dates.map((d) => data.body[d]?.weight).filter((x): x is number => typeof x === 'number');
  const waists = dates.map((d) => data.body[d]?.waist).filter((x): x is number => typeof x === 'number');
  const start = data.profile.startDate;
  const inProgram = dates.filter((d) => !start || d >= start);
  let daysOnPlan = 0;
  const steps: number[] = [];
  const sleeps: number[] = [];
  const energy: number[] = [];
  const hunger: number[] = [];
  for (const d of inProgram) {
    const s = daySummary(data, d);
    if (s.onPlan) daysOnPlan++;
    const log = data.dayLogs[d];
    if (log?.steps != null) steps.push(log.steps);
    if (log?.sleep != null) sleeps.push(log.sleep);
    if (log?.energy != null) energy.push(log.energy);
    if (log?.hunger != null) hunger.push(log.hunger);
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const wk = { full: 0, minimum: 0, walk: 0, credit: 0 };
  for (const d of dates) {
    const k = workoutKindOn(data.workouts, d);
    if (k) wk[k]++;
  }
  wk.credit = Math.round((wk.full + wk.minimum * 0.7 + wk.walk * 0.4) * 10) / 10;
  return {
    weekStart: sunday,
    week: start ? statsWeekNumber(start, sunday) : 1,
    avgWeight: weights.length >= 3 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 100) / 100 : null,
    weighIns: weights.length,
    waist: waists.length ? waists[waists.length - 1] : null,
    daysOnPlan,
    adherence: daysOnPlan / 7,
    avgSteps: avg(steps) != null ? Math.round(avg(steps) as number) : null,
    avgSleep: avg(sleeps) != null ? Math.round((avg(sleeps) as number) * 10) / 10 : null,
    avgEnergy: avg(energy) != null ? Math.round((avg(energy) as number) * 10) / 10 : null,
    avgHunger: avg(hunger) != null ? Math.round((avg(hunger) as number) * 10) / 10 : null,
    workouts: wk,
    painFlags: data.painFlags.filter((p) => p.date >= sunday && p.date <= addDays(sunday, 6)).length,
    holiday: data.settings.holidayWeeks.includes(sunday),
  };
}

/** Completed Sunday-Saturday weeks since the start date, oldest first. */
export function completedWeeks(data: AppData, today: ISODate): WeekStats[] {
  const start = data.profile.startDate;
  if (!start) return [];
  const out: WeekStats[] = [];
  for (let s = weekStart(start); addDays(s, 6) < today; s = addDays(s, 7)) out.push(weekStats(data, s));
  return out;
}

export function runReview(data: AppData, today: ISODate): ReviewResult {
  return weeklyReview(completedWeeks(data, today), {
    w0: data.profile.startWeight,
    currentWeek: Math.min(12, weekFor(data, today)),
    stepsAdjust: data.adjust.stepsAdjust,
    kcalAdjust: data.adjust.kcalAdjust,
    planAvgKcal: planAverageKcal(data.plan),
    doctorCleared: data.settings.doctorCleared,
  });
}

export function streaksAndXp(data: AppData, today: ISODate) {
  const start = data.profile.startDate;
  if (!start || start > today) return { current: 0, best: 0, xp: 0, level: levelFor(0) };
  const days = rangeDates(start, today).map((d) => ({ date: d, score: daySummary(data, d).score.total }));
  const { current, best } = computeStreaks(days, today);
  const xp = days.reduce((a, d) => a + d.score, 0);
  return { current, best, xp, level: levelFor(xp) };
}

export function earlyDeload(data: AppData, today: ISODate) {
  const names = new Set<string>();
  for (const w of data.workouts) for (const s of w.sets) if (s.done && (s.weight ?? 0) > 0) names.add(s.nameUsed);
  const histories = [...names].map((n) => historyFor(data.workouts, n));
  const last5 = [1, 2, 3, 4, 5].map((i) => addDays(today, -i));
  return earlyDeloadCheck({
    droppingExercises: countDroppingExercises(histories),
    sleepLast5: last5.map((d) => data.dayLogs[d]?.sleep),
    energyLast5: last5.map((d) => data.dayLogs[d]?.energy),
  });
}

/** Daily message index: never repeated within 14 days. Deterministic per date. */
export function pickMessageIndex(history: Record<ISODate, number>, date: ISODate, count = DAILY_MESSAGES.length): number {
  if (history[date] != null) return history[date];
  const recent = new Set<number>();
  for (let i = 1; i <= 14; i++) {
    const v = history[addDays(date, -i)];
    if (v != null) recent.add(v);
  }
  let seed = 0;
  for (const ch of date) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;
  for (let k = 0; k < count; k++) {
    const idx = (seed + k * 7) % count;
    if (!recent.has(idx)) return idx;
  }
  return seed % count;
}

/** Weekly average change vs the start weight (latest week with 3+ weigh-ins). */
export function totalLost(data: AppData, today: ISODate): number | null {
  const start = data.profile.startDate;
  if (!start) return null;
  let s = weekStart(today);
  for (let i = 0; i < 30; i++) {
    const st = weekStats(data, s);
    if (st.avgWeight != null) return Math.round((data.profile.startWeight - st.avgWeight) * 10) / 10;
    if (s < start) break;
    s = addDays(s, -7);
  }
  return null;
}

export function latestWaist(data: AppData): number | null {
  const dates = Object.keys(data.body).filter((d) => data.body[d].waist != null).sort();
  return dates.length ? (data.body[dates[dates.length - 1]].waist as number) : null;
}

export function latestWeight(data: AppData): { date: ISODate; weight: number } | null {
  const dates = Object.keys(data.body).filter((d) => data.body[d].weight != null).sort();
  if (!dates.length) return null;
  const d = dates[dates.length - 1];
  return { date: d, weight: data.body[d].weight as number };
}

/** Badges earned now that were not earned before. */
export function evaluateBadges(data: AppData, today: ISODate): BadgeId[] {
  const earned = new Set(Object.keys(data.badges));
  const out: BadgeId[] = [];
  const add = (id: BadgeId, cond: boolean) => {
    if (cond && !earned.has(id)) out.push(id);
  };
  const finished = data.workouts.filter((w) => w.finished);
  add('first_workout', finished.some((w) => w.kind !== 'walk'));
  const weeks = completedWeeks(data, addDays(today, 1));
  add('full_week', weeks.some((w) => w.workouts.full >= 4));
  const { best } = streaksAndXp(data, today);
  add('streak_7', best >= 7);
  add('streak_30', best >= 30);
  add('first_pr', finished.some((w) => (w.prs?.length ?? 0) > 0));
  const lost = totalLost(data, today);
  add('lost_2', lost != null && lost >= 2);
  add('lost_5', lost != null && lost >= 5);
  add('lost_10', lost != null && lost >= 10);
  const waist = latestWaist(data);
  add('waist_5', waist != null && data.profile.startWaist - waist >= 5);
  // Oil rule week: 7 consecutive days with the oil rule ticked (measured, 4 tsp or less).
  let oilRun = 0;
  let oilBest = 0;
  const start = data.profile.startDate;
  if (start && start <= today) {
    for (const d of rangeDates(start, today)) {
      const l = data.dayLogs[d];
      if (l?.oilMeasured && (l.oilTsp ?? 0) <= 4) oilRun++;
      else oilRun = 0;
      oilBest = Math.max(oilBest, oilRun);
    }
  }
  add('zero_oil', oilBest >= 7);
  add('planb_master', data.planBCount >= 5 && weeks.some((w) => w.daysOnPlan >= 5));
  add('deload_done', finished.some((w) => w.deload && w.kind === 'full'));
  add('week12_test', !!data.strengthTests.final);
  return out;
}

export const ALL_BADGES = BADGES;

export function daysSince(a: ISODate, b: ISODate): number {
  return diffDays(a, b);
}
