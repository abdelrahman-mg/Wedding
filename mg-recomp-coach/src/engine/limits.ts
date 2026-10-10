// Hard limits (section 6.5) and joint-safety rules (section 5.4).
import { HARD_LIMITS } from '../data/phases';

export interface LimitCtx {
  planAvgKcal: number;
  doctorCleared: boolean;
  /** Base step target of the current week (without adjust). */
  stepsBase: number;
  /** Base cardio minutes of the current week (without adjust). */
  cardioBase: number;
}

export interface LimitResult {
  ok: boolean;
  reason?: string;
}

export function checkKcalAdjust(value: number, ctx: LimitCtx): LimitResult {
  if (ctx.doctorCleared) {
    if (ctx.planAvgKcal + value < 1500) return { ok: false, reason: 'Even with doctor clearance the app will not go below 1,500 kcal a day.' };
    return { ok: true };
  }
  if (value < HARD_LIMITS.kcalAdjustMin) {
    return { ok: false, reason: `Calorie cuts stop at ${HARD_LIMITS.kcalAdjustMin} kcal from the plan until a doctor reviews your labs and BP.` };
  }
  if (ctx.planAvgKcal + value < HARD_LIMITS.kcalFloor) {
    return { ok: false, reason: `Average intake would drop below about ${HARD_LIMITS.kcalFloor} kcal. That is the floor for this plan.` };
  }
  return { ok: true };
}

/** Manual base-kcal edits: the resulting day must stay at or above the floor. */
export function checkBaseKcal(value: number, kcalAdjust: number, doctorCleared: boolean): LimitResult {
  const floor = doctorCleared ? 1500 : HARD_LIMITS.kcalFloor;
  if (value + kcalAdjust < floor) return { ok: false, reason: `A day target below ${floor} kcal is not allowed.` };
  if (value > 3500) return { ok: false, reason: 'That is above maintenance. Use holiday mode for a maintenance week.' };
  return { ok: true };
}

export function checkStepsAdjust(value: number, ctx: LimitCtx): LimitResult {
  if (!ctx.doctorCleared && ctx.stepsBase + value > HARD_LIMITS.stepsMax) {
    return { ok: false, reason: `Daily step target stays at ${HARD_LIMITS.stepsMax.toLocaleString('en-US')} or less.` };
  }
  if (ctx.stepsBase + value < 3000) return { ok: false, reason: 'Step target cannot go below 3,000.' };
  return { ok: true };
}

export function checkCardioAdjust(value: number, ctx: LimitCtx): LimitResult {
  const total = ctx.cardioBase + value;
  if (total > HARD_LIMITS.cardioMax) return { ok: false, reason: `Cardio per session stays at ${HARD_LIMITS.cardioMax} minutes or less.` };
  if (total < HARD_LIMITS.cardioMin) return { ok: false, reason: `Cardio per session stays at ${HARD_LIMITS.cardioMin} minutes or more.` };
  if (Math.abs(value) % 5 !== 0) return { ok: false, reason: 'Cardio changes go in steps of 5 minutes.' };
  return { ok: true };
}

export function checkProtein(value: number, manual: boolean): LimitResult {
  if (!manual && value < HARD_LIMITS.proteinMinAuto) return { ok: false, reason: 'The coach never sets protein below 150 g.' };
  if (value < 100) return { ok: false, reason: 'Protein below 100 g is not allowed in this plan.' };
  if (value > 250) return { ok: false, reason: 'That is far more protein than you need.' };
  return { ok: true };
}

// Joint safety ---------------------------------------------------------------

const SHOULDER_RULES: { re: RegExp; why: string }[] = [
  { re: /behind[\s-]*(the[\s-]*)?neck/i, why: 'Behind-the-neck moves put an unstable shoulder in its weakest position.' },
  { re: /\bdips?\b/i, why: 'Dips stretch the front of the shoulder under load. Not allowed with your dislocation history.' },
  { re: /\bfl(y|ye|yes|ies)\b|pec[\s-]?deck(?!.*reverse)|butterfly/i, why: 'Chest flyes take the shoulder into a deep stretch. Not allowed.' },
  { re: /upright\s*row/i, why: 'Upright rows pinch the shoulder joint. Not allowed.' },
  { re: /overhead\s*press|military\s*press|shoulder\s*press|push\s*press|arnold\s*press|\bOHP\b/i, why: 'Heavy overhead pressing is off the table for your right shoulder.' },
  { re: /snatch|clean\s*and\s*jerk|\bjerk\b|kipping/i, why: 'Explosive overhead lifts are not safe for an unstable shoulder.' },
];

const KNEE_RULES: { re: RegExp; why: string }[] = [
  { re: /jump|plyo|box\s*jump|burpee|\bskip(ping)?\b|\bhops?\b/i, why: 'No jumping: protect the repaired knee.' },
  { re: /\brun(ning)?\b|sprint|jog/i, why: 'No running in this plan. Use incline walking, bike or elliptical.' },
  { re: /lunge|split\s*squat|pistol/i, why: 'Lunges and split squats load the knee with pivoting. Use the leg press or box squat.' },
  { re: /leg\s*extension/i, why: 'Leg extensions are excluded (end-range knee stress). The light 90-45 degree version can be unlocked after week 6 in Plan settings.' },
  { re: /\bHIIT\b|tabata/i, why: 'No HIIT in this plan. Keep cardio easy and steady.' },
];

export interface JointCheck {
  blocked: boolean;
  reason?: string;
  joint?: 'shoulder' | 'knee';
}

export function checkExerciseSafety(name: string): JointCheck {
  // Allowed: reverse pec-deck (rear delts).
  if (/reverse\s*pec[\s-]?deck|reverse\s*fly/i.test(name)) return { blocked: false };
  for (const r of SHOULDER_RULES) if (r.re.test(name)) return { blocked: true, reason: r.why, joint: 'shoulder' };
  for (const r of KNEE_RULES) if (r.re.test(name)) return { blocked: true, reason: r.why, joint: 'knee' };
  return { blocked: false };
}

/** Filter for AI or free text: content the app must never show as advice. */
const FORBIDDEN_CONTENT = /\bHIIT\b|sprint|\bjump|fat[\s-]*burner|detox|diet\s*pill|insulin\s*(supplement|pill)|laxative|sauna\s*suit|water\s*fast|dry\s*fast/i;

export function containsForbiddenAdvice(text: string): boolean {
  return FORBIDDEN_CONTENT.test(text);
}
