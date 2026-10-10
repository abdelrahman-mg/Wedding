// The "coach": weekly review (6.1-6.2), recovery and safety triggers (6.4). Pure functions.
import { HARD_LIMITS } from '../data/phases';
import { addDays, diffDays } from './dates';
import { checkKcalAdjust } from './limits';
import { droppedVsPrevious, type ExerciseSession } from './progression';
import { expectedWeight, stepTarget, weekTarget } from './targets';
import type { BpEntry, ChangeType, ISODate, PainFlag } from './types';

export interface WeekStats {
  weekStart: ISODate;
  week: number; // program week of this Sunday-Saturday week
  avgWeight: number | null; // null when fewer than 3 weigh-ins
  weighIns: number;
  waist: number | null;
  daysOnPlan: number;
  adherence: number; // 0..1
  avgSteps: number | null;
  avgSleep: number | null;
  avgEnergy: number | null;
  avgHunger: number | null;
  workouts: { full: number; minimum: number; walk: number; credit: number };
  painFlags: number;
  holiday: boolean;
}

export interface ReviewCtx {
  w0: number;
  currentWeek: number;
  stepsAdjust: number;
  kcalAdjust: number;
  planAvgKcal: number;
  doctorCleared: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  reason: string;
  change: string;
  apply: { type: ChangeType; value: number | string }[];
}

export type ReviewStatus =
  | 'noWeeks'
  | 'needData'
  | 'learning'
  | 'holiday'
  | 'onTrack'
  | 'aboveOneWeek'
  | 'above'
  | 'aboveMidAdherence'
  | 'aboveLowAdherence'
  | 'limitsReached'
  | 'below'
  | 'fastLoss';

export interface ReviewMetrics {
  latestAvg: number | null;
  expected: number | null;
  bandLow: number | null;
  bandHigh: number | null;
  /** kg per week, positive = losing. */
  ratePerWeek: number | null;
  /** latest average minus expected (positive = above). */
  distanceFromBand: number | null;
  projectedWeek12: number | null;
}

export interface ReviewResult {
  status: ReviewStatus;
  headline: string;
  messages: string[];
  proposals: Proposal[];
  metrics: ReviewMetrics;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const BAND = 1.5;

function computeMetrics(weeks: WeekStats[], w0: number): ReviewMetrics {
  const withAvg = weeks.filter((w) => w.avgWeight != null && w.week >= 1);
  const empty: ReviewMetrics = { latestAvg: null, expected: null, bandLow: null, bandHigh: null, ratePerWeek: null, distanceFromBand: null, projectedWeek12: null };
  if (!withAvg.length) return empty;
  const latest = withAvg[withAvg.length - 1];
  const t = Math.min(12, latest.week);
  const e = expectedWeight(t, w0);
  // Rate over the last two weeks (baseline W0 counts as week 0).
  const series = [{ week: 0, avg: w0 }, ...withAvg.map((w) => ({ week: w.week, avg: w.avgWeight as number }))];
  const last = series[series.length - 1];
  const ref = series.filter((p) => p.week >= last.week - 2 && p.week < last.week)[0];
  const rate = ref ? (ref.avg - last.avg) / (last.week - ref.week) : null;
  const projected = rate != null ? last.avg - rate * Math.max(0, 12 - last.week) : null;
  return {
    latestAvg: r1(last.avg),
    expected: r1(e),
    bandLow: r1(e - BAND),
    bandHigh: r1(e + BAND),
    ratePerWeek: rate != null ? Math.round(rate * 100) / 100 : null,
    distanceFromBand: r1(last.avg - e),
    projectedWeek12: projected != null ? r1(projected) : null,
  };
}

/**
 * Weekly review over completed Sunday-Saturday weeks (chronological).
 * Uses only weekly averages, never a single weigh-in.
 */
export function weeklyReview(weeks: WeekStats[], ctx: ReviewCtx): ReviewResult {
  const done = weeks.filter((w) => w.week >= 1);
  const metrics = computeMetrics(done, ctx.w0);
  const messages: string[] = [];
  const proposals: Proposal[] = [];

  if (!done.length) {
    return { status: 'noWeeks', headline: 'First review after your first full week.', messages: ['Weigh in every morning. The coach needs at least 3 weigh-ins per week.'], proposals, metrics };
  }

  const latest = done[done.length - 1];
  const prev = done.length >= 2 ? done[done.length - 2] : null;
  const prev2 = done.length >= 3 ? done[done.length - 3] : null;
  const t = Math.min(12, latest.week);

  if (latest.avgWeight == null) {
    return { status: 'needData', headline: 'Log more weigh-ins', messages: [`Only ${latest.weighIns} weigh-in${latest.weighIns === 1 ? '' : 's'} last week. The coach needs at least 3 to judge the trend.`], proposals, metrics };
  }

  if (t <= 2) {
    const e = expectedWeight(t, ctx.w0);
    const inside = Math.abs(latest.avgWeight - e) <= BAND;
    messages.push('Learning phase: weight changes now are mostly water and food volume. Keep logging.');
    messages.push(inside ? 'Your average is inside the expected band.' : `Your average is ${r1(latest.avgWeight - e)} kg from the expected value. No changes in weeks 1-2.`);
    return { status: 'learning', headline: 'Learning phase (weeks 1-2)', messages, proposals, metrics };
  }

  if (latest.holiday) {
    return { status: 'holiday', headline: 'Holiday week: band check paused', messages: ['Maintenance week. Restart the plan with your next meal.'], proposals, metrics };
  }

  const E = (w: WeekStats) => expectedWeight(Math.min(12, w.week), ctx.w0);
  const above = (w: WeekStats | null) => !!w && w.avgWeight != null && !w.holiday && w.avgWeight - E(w) > BAND;
  const below = (w: WeekStats | null) => !!w && w.avgWeight != null && E(w) - w.avgWeight > BAND;
  const consecutive = (a: WeekStats | null, b: WeekStats | null) => !!a && !!b && b.week - a.week === 1;

  // Waist: down 1 cm+ over 2 weeks while weight flat or inside the band.
  const waistRef = prev2?.waist ?? prev?.waist ?? null;
  if (latest.waist != null && waistRef != null && waistRef - latest.waist >= 1) {
    const flat = prev?.avgWeight != null && Math.abs(prev.avgWeight - latest.avgWeight) < 0.5;
    const inside = Math.abs(latest.avgWeight - E(latest)) <= BAND;
    if (flat || inside) messages.push(`Waist down ${r1(waistRef - latest.waist)} cm in 2 weeks: recomposition is working, keep the plan.`);
  }

  // Too fast: below the band, or losing > 1.3 kg/week two weeks in a row.
  const loss = (a: WeekStats | null, b: WeekStats | null) =>
    a && b && a.avgWeight != null && b.avgWeight != null && consecutive(a, b) ? a.avgWeight - b.avgWeight : null;
  const l1 = loss(prev, latest);
  const l2 = loss(prev2, prev);
  const fast = l1 != null && l2 != null && l1 > 1.3 && l2 > 1.3;
  if (below(latest) || fast) {
    proposals.push({
      id: `${latest.weekStart}:kcal+200`,
      title: 'Eat a bit more',
      reason: fast
        ? `You lost ${r1(l2 as number)} and ${r1(l1 as number)} kg in the last two weeks. Faster than about 1.3 kg/week costs muscle and energy.`
        : `Your average (${r1(latest.avgWeight)} kg) is more than 1.5 kg below the expected ${r1(E(latest))} kg.`,
      change: `kcal target +200 per day (extra carbs around training: e.g. 1/2 cup more rice at lunch and dinner on gym days). New adjustment: ${ctx.kcalAdjust + 200 > 0 ? '+' : ''}${ctx.kcalAdjust + 200} kcal.`,
      apply: [{ type: 'kcalAdjust', value: ctx.kcalAdjust + 200 }],
    });
    messages.push('Strength and energy check: are your lifts holding? Is your energy 3 or more most days? If not, the extra food will help.');
    return { status: fast ? 'fastLoss' : 'below', headline: fast ? 'Losing faster than planned' : 'Below the expected band', messages, proposals, metrics };
  }

  if (Math.abs(latest.avgWeight - E(latest)) <= BAND) {
    messages.unshift('Inside the band. On track: no changes needed.');
    return { status: 'onTrack', headline: 'On track', messages, proposals, metrics };
  }

  // Above band.
  if (!(above(prev) && consecutive(prev, latest))) {
    messages.unshift('Above the band this week. One week is noise: no change yet. Keep the plan and check again next Sunday.');
    return { status: 'aboveOneWeek', headline: 'Above band (1 week)', messages, proposals, metrics };
  }

  const adherence = ((prev as WeekStats).daysOnPlan + latest.daysOnPlan) / 14;
  const pct = Math.round(adherence * 100);

  if (adherence < 0.7) {
    messages.unshift(`Above the band for 2 weeks, but only ${pct}% of days were on plan. Cutting food now would not fix that. Fix the basics first:`);
    messages.push('Meal prep on Friday morning and Tuesday evening.');
    messages.push('Eat the planned snacks: they stop the 4 pm and night cravings.');
    messages.push('Bad day? Do the 30-minute minimum version instead of skipping.');
    messages.push('One planned treat per week: move it, do not add a second.');
    return { status: 'aboveLowAdherence', headline: 'Fix adherence first', messages, proposals, metrics };
  }

  if (adherence < 0.85) {
    messages.unshift(`Above the band for 2 weeks with ${pct}% of days on plan. No change yet: hit 85% for two weeks and the scale should follow.`);
    return { status: 'aboveMidAdherence', headline: 'Almost there: aim for 85%', messages, proposals, metrics };
  }

  const currentSteps = stepTarget(ctx.currentWeek, ctx.stepsAdjust, Infinity);
  if (currentSteps < HARD_LIMITS.stepsMax) {
    const add = Math.min(1500, HARD_LIMITS.stepsMax - currentSteps);
    proposals.push({
      id: `${latest.weekStart}:steps`,
      title: 'More steps',
      reason: `Above the band for 2 weeks with ${pct}% adherence. Steps first: they cost no food and help blood sugar.`,
      change: `Daily step target +${add.toLocaleString('en-US')} (to ${(currentSteps + add).toLocaleString('en-US')}).`,
      apply: [{ type: 'stepsAdjust', value: ctx.stepsAdjust + add }],
    });
    return { status: 'above', headline: 'Above band 2 weeks: add steps', messages, proposals, metrics };
  }

  const newAdj = ctx.kcalAdjust - 150;
  const okFloor = ctx.planAvgKcal + newAdj >= HARD_LIMITS.kcalFloor;
  const limit = checkKcalAdjust(newAdj, { planAvgKcal: ctx.planAvgKcal, doctorCleared: ctx.doctorCleared, stepsBase: weekTarget(ctx.currentWeek).steps, cardioBase: weekTarget(ctx.currentWeek).cardio });
  if (okFloor && limit.ok) {
    proposals.push({
      id: `${latest.weekStart}:kcal-150`,
      title: 'Small calorie trim',
      reason: `Above the band for 2 weeks with ${pct}% adherence, and steps are already at ${HARD_LIMITS.stepsMax.toLocaleString('en-US')}.`,
      change: `kcal target -150 per day. Suggested way: skip the night banana or cut 1 tsp of oil per day. New adjustment: ${newAdj} kcal.`,
      apply: [{ type: 'kcalAdjust', value: newAdj }],
    });
    return { status: 'above', headline: 'Above band 2 weeks: small trim', messages, proposals, metrics };
  }

  messages.unshift(
    'Above the band for 2 weeks, but the hard limits are reached (12,000 steps, about 1,700 kcal). Do not cut further. Get a doctor and lab review and talk to a coach before changing anything.',
  );
  return { status: 'limitsReached', headline: 'Hard limits reached', messages, proposals, metrics };
}

// Recovery triggers ------------------------------------------------------------

/** Exercises whose last two sessions each dropped vs the session before. */
export function countDroppingExercises(histories: ExerciseSession[][]): number {
  let n = 0;
  for (const h of histories) {
    const s = h.filter((x) => !x.deload);
    if (s.length < 3) continue;
    const [a, b, c] = s.slice(-3);
    if (droppedVsPrevious(a, b) && droppedVsPrevious(b, c)) n++;
  }
  return n;
}

export interface EarlyDeloadInput {
  droppingExercises: number;
  sleepLast5: (number | null | undefined)[];
  energyLast5: (number | null | undefined)[];
}

export function earlyDeloadCheck(i: EarlyDeloadInput): { trigger: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (i.droppingExercises >= 3) reasons.push(`Strength dropped two sessions in a row on ${i.droppingExercises} exercises.`);
  const sleeps = i.sleepLast5.filter((x): x is number => typeof x === 'number');
  if (sleeps.length >= 3) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    if (avg < 6) reasons.push(`Average sleep over the last 5 days is ${r1(avg)} hours.`);
  }
  const lowEnergy = i.energyLast5.filter((x) => typeof x === 'number' && x <= 2).length;
  if (lowEnergy >= 3) reasons.push(`Energy was 1-2 on ${lowEnergy} of the last 5 days.`);
  return { trigger: reasons.length > 0, reasons };
}

export function deloadProposal(today: ISODate, reasons: string[], kcalAdjust: number): Proposal {
  const until = addDays(today, 6);
  return {
    id: `${today}:deload`,
    title: 'Take a 7-day deload',
    reason: reasons.join(' '),
    change: `Deload until ${until}: half the sets, about 90% weights, RIR 4, plus 150 kcal per day for that week.`,
    apply: [{ type: 'deloadUntil', value: until }],
  };
}

// Pain -------------------------------------------------------------------------

export function painStatus(flags: PainFlag[], today: ISODate): { part: 'shoulder' | 'knee'; count: number; refer: boolean }[] {
  return (['shoulder', 'knee'] as const).map((part) => {
    const dates = new Set(flags.filter((f) => f.bodyPart === part && diffDays(f.date, today) <= 14 && diffDays(f.date, today) >= 0).map((f) => f.date));
    return { part, count: dates.size, refer: dates.size >= 2 };
  });
}

// Blood pressure -----------------------------------------------------------------

export type BpLevel = 'none' | 'normal' | 'elevated' | 'doctorSoon' | 'urgent';

export function isHighBp(e: Pick<BpEntry, 'systolic' | 'diastolic'>): boolean {
  return e.systolic >= 130 || e.diastolic >= 80;
}

export function isCrisisBp(e: Pick<BpEntry, 'systolic' | 'diastolic'>): boolean {
  return e.systolic >= 180 || e.diastolic >= 120;
}

export function bpStatus(entries: BpEntry[]): { level: BpLevel; message: string } {
  if (!entries.length) return { level: 'none', message: 'No BP readings yet. Log one when you can.' };
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = sorted[sorted.length - 1];
  if (isCrisisBp(latest) || (isHighBp(latest) && latest.symptoms)) {
    return {
      level: 'urgent',
      message: 'This reading needs urgent care. Sit and rest, re-measure in 5 minutes, and if it stays this high or you have symptoms (chest pain, severe headache, vision changes, weakness), go to the emergency room or call 123.',
    };
  }
  const last3 = sorted.slice(-3);
  if (last3.length >= 3 && last3.every(isHighBp)) {
    return { level: 'doctorSoon', message: 'Your last 3 readings were at or above 130/80. Book a doctor visit soon.' };
  }
  if (isHighBp(latest)) return { level: 'elevated', message: 'This reading is at or above 130/80. Keep logging: 3 high readings means a doctor visit.' };
  return { level: 'normal', message: 'Latest reading is below 130/80.' };
}
