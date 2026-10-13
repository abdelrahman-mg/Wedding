// The "coach": weekly review (6.1-6.2), recovery and safety triggers (6.4). Pure functions.
import { HARD_LIMITS } from '../data/phases';
import { addDays, diffDays } from './dates';
import { checkKcalAdjust } from './limits';
import { droppedVsPrevious, type ExerciseSession } from './progression';
import { LOSS_MAX, LOSS_MIN, weekTarget, weightBand } from './targets';
import type { BpEntry, ChangeType, ISODate, PainFlag } from './types';

export interface WeekStats {
  weekStart: ISODate;
  week: number; // program week of this Sunday-Saturday week
  avgWeight: number | null; // null when fewer than 2 weigh-ins
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
  | 'fastLoss'
  | 'slow'
  | 'stalled'
  | 'stalledLowAdherence'
  | 'limitsReached';

export interface ReviewMetrics {
  latestAvg: number | null;
  /** Average of the week before the latest one (or the start weight for the first week). */
  prevAvg: number | null;
  /** Latest average minus the previous one. Negative = lost weight. */
  changeVsPrev: number | null;
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
/** A week with less loss than this counts as a stall (flat or gaining). */
const STALL_LOSS = 0.1;
const KCAL_UP = 100;
const KCAL_DOWN = 100;

function computeMetrics(weeks: WeekStats[], w0: number): ReviewMetrics {
  const withAvg = weeks.filter((w) => w.avgWeight != null && w.week >= 1);
  const empty: ReviewMetrics = { latestAvg: null, prevAvg: null, changeVsPrev: null, expected: null, bandLow: null, bandHigh: null, ratePerWeek: null, distanceFromBand: null, projectedWeek12: null };
  if (!withAvg.length) return empty;
  const latest = withAvg[withAvg.length - 1];
  const t = Math.min(12, latest.week);
  const b = weightBand(t, w0);
  // Compare with the nearest earlier week that has an average (the start weight counts as week 0).
  const series = [{ week: 0, avg: w0 }, ...withAvg.map((w) => ({ week: w.week, avg: w.avgWeight as number }))];
  const last = series[series.length - 1];
  const ref = series[series.length - 2];
  const rate = ref ? (ref.avg - last.avg) / Math.max(1, last.week - ref.week) : null;
  const projected = rate != null ? last.avg - rate * Math.max(0, 12 - last.week) : null;
  return {
    latestAvg: r1(last.avg),
    prevAvg: ref ? r1(ref.avg) : null,
    changeVsPrev: ref ? Math.round((last.avg - ref.avg) * 100) / 100 : null,
    expected: r1(b.expected),
    bandLow: r1(b.low),
    bandHigh: r1(b.high),
    ratePerWeek: rate != null ? Math.round(rate * 100) / 100 : null,
    distanceFromBand: r1(last.avg - b.expected),
    projectedWeek12: projected != null ? r1(projected) : null,
  };
}

/**
 * Weekly check-in over completed Sunday-Saturday weeks (chronological).
 * Compares each weekly average with the week before. Target loss is 0.3-0.7 kg a week:
 * faster than that suggests a little more food, a 2-week stall suggests a little less.
 */
export function weeklyReview(weeks: WeekStats[], ctx: ReviewCtx): ReviewResult {
  const done = weeks.filter((w) => w.week >= 1);
  const metrics = computeMetrics(done, ctx.w0);
  const messages: string[] = [];
  const proposals: Proposal[] = [];

  if (!done.length) {
    return { status: 'noWeeks', headline: 'First check-in after your first full week.', messages: ['Weigh in on the smart scale every morning, or at least 3 times a week. The weekly average is what counts.'], proposals, metrics };
  }

  const latest = done[done.length - 1];
  const prev = done.length >= 2 ? done[done.length - 2] : null;
  const t = Math.min(12, latest.week);

  if (latest.avgWeight == null) {
    return { status: 'needData', headline: 'Log more weigh-ins', messages: [`Only ${latest.weighIns} weigh-in${latest.weighIns === 1 ? '' : 's'} last week. Two or more are needed for a weekly average.`], proposals, metrics };
  }

  const rate = metrics.ratePerWeek as number;
  const rateText = `${rate >= 0 ? 'Down' : 'Up'} ${Math.abs(rate).toFixed(2)} kg vs the week before. Target: ${LOSS_MIN}-${LOSS_MAX} kg a week.`;

  if (t <= 2) {
    messages.push('Learning phase: weight changes now are mostly water and food volume. Keep logging.', rateText);
    return { status: 'learning', headline: 'Learning phase (weeks 1-2)', messages, proposals, metrics };
  }

  if (latest.holiday) {
    return { status: 'holiday', headline: 'Holiday week: check paused', messages: ['Maintenance week. Restart the plan with your next meal.'], proposals, metrics };
  }

  // Waist: down 1 cm+ over 2 weeks while weight is flat.
  const prev2 = done.length >= 3 ? done[done.length - 3] : null;
  const waistRef = prev2?.waist ?? prev?.waist ?? null;
  if (latest.waist != null && waistRef != null && waistRef - latest.waist >= 1 && rate < LOSS_MIN) {
    messages.push(`Waist down ${r1(waistRef - latest.waist)} cm in 2 weeks while the scale is slow: recomposition is working, keep the plan.`);
  }

  if (rate > LOSS_MAX) {
    const newAdj = ctx.kcalAdjust + KCAL_UP;
    proposals.push({
      id: `${latest.weekStart}:kcal+${KCAL_UP}`,
      title: 'Eat a little more',
      reason: `You lost ${rate.toFixed(2)} kg this week. Faster than ${LOSS_MAX} kg a week risks muscle and gym strength.`,
      change: `kcal target +${KCAL_UP} per day (for example 1/2 cup more rice at lunch). New adjustment: ${newAdj > 0 ? '+' : ''}${newAdj} kcal.`,
      apply: [{ type: 'kcalAdjust', value: newAdj }],
    });
    messages.unshift(rateText, 'Strength check: are your lifts holding or going up? If not, the extra food will help.');
    return { status: 'fastLoss', headline: 'Losing faster than planned', messages, proposals, metrics };
  }

  if (rate >= LOSS_MIN) {
    messages.unshift(rateText, 'In the target range. No changes needed.');
    return { status: 'onTrack', headline: 'On track', messages, proposals, metrics };
  }

  const stallWeek = (w: WeekStats | null, before: WeekStats | null) =>
    !!w && !!before && w.avgWeight != null && before.avgWeight != null && w.week - before.week === 1 && before.avgWeight - w.avgWeight < STALL_LOSS;
  const stalledTwo = stallWeek(latest, prev) && rate < STALL_LOSS && !!prev && prev.avgWeight != null && !!prev2 && prev2.avgWeight != null && prev.avgWeight - prev2.avgWeight < STALL_LOSS && prev.week - prev2.week === 1;

  if (!stalledTwo) {
    messages.unshift(rateText, rate < STALL_LOSS ? 'No real loss this week. One week is noise: no change yet. If next week is flat too, the check-in will suggest a small trim.' : 'A little under target. Keep the plan and check again next week.');
    return { status: 'slow', headline: rate < STALL_LOSS ? 'Flat this week' : 'A bit slow', messages, proposals, metrics };
  }

  const adherence = ((prev as WeekStats).daysOnPlan + latest.daysOnPlan) / 14;
  const pct = Math.round(adherence * 100);
  if (adherence < 0.7) {
    messages.unshift(`Flat for 2 weeks, but only ${pct}% of days were on plan. Cutting food now would not fix that. Fix the basics first:`);
    messages.push('Tick the meals you eat, every day.', 'Eat the planned snacks: they stop the 4 pm and night cravings.', 'Bad day? Use busy-day mode or the 30-minute minimum workout instead of skipping.');
    return { status: 'stalledLowAdherence', headline: 'Fix adherence first', messages, proposals, metrics };
  }

  const newAdj = ctx.kcalAdjust - KCAL_DOWN;
  const okFloor = ctx.planAvgKcal + newAdj >= HARD_LIMITS.kcalFloor;
  const limit = checkKcalAdjust(newAdj, { planAvgKcal: ctx.planAvgKcal, doctorCleared: ctx.doctorCleared, stepsBase: weekTarget(ctx.currentWeek).steps, cardioBase: weekTarget(ctx.currentWeek).cardio });
  if (okFloor && limit.ok) {
    proposals.push({
      id: `${latest.weekStart}:kcal-${KCAL_DOWN}`,
      title: 'Small calorie trim',
      reason: `Weight has been flat for 2 weeks with ${pct}% of days on plan.`,
      change: `kcal target -${KCAL_DOWN} per day. Easy way: 1 less thumb of oil or skip the night banana. New adjustment: ${newAdj} kcal.`,
      apply: [{ type: 'kcalAdjust', value: newAdj }],
    });
    messages.unshift(rateText);
    return { status: 'stalled', headline: 'Flat for 2 weeks: small trim', messages, proposals, metrics };
  }

  messages.unshift('Flat for 2 weeks, but the calorie floor (about 1,700 kcal) is reached. Do not cut further. Get a doctor and lab review before changing anything.');
  return { status: 'limitsReached', headline: 'Calorie floor reached', messages, proposals, metrics };
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
    change: `Deload until ${until}: half the sets, about 90% weights, plus 150 kcal per day for that week.`,
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
