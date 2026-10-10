import { ALL_EXERCISES, altDisplayName } from '../src/data/sessions';
import { checkBaseKcal, checkCardioAdjust, checkExerciseSafety, checkKcalAdjust, checkProtein, checkStepsAdjust, containsForbiddenAdvice, validateChange, type LimitCtx } from '../src/engine/limits';
import { defaultData, migrate, SCHEMA_VERSION } from '../src/engine/defaults';
import { parseChange } from '../src/services/aiCoach';

const ctx: LimitCtx = { planAvgKcal: 1956, doctorCleared: false, stepsBase: 10000, cardioBase: 35 };

describe('hard limits (6.5)', () => {
  test('kcal adjust cannot go below -250 or the 1,700 floor', () => {
    expect(checkKcalAdjust(-150, ctx).ok).toBe(true);
    expect(checkKcalAdjust(-250, ctx).ok).toBe(true);
    expect(checkKcalAdjust(-300, ctx).ok).toBe(false);
    expect(checkKcalAdjust(-200, { ...ctx, planAvgKcal: 1850 }).ok).toBe(false);
    expect(checkKcalAdjust(200, ctx).ok).toBe(true);
  });

  test('step target never above 12,000', () => {
    expect(checkStepsAdjust(2000, ctx).ok).toBe(true);
    expect(checkStepsAdjust(2500, ctx).ok).toBe(false);
  });

  test('cardio between 15 and 45 minutes', () => {
    expect(checkCardioAdjust(10, ctx).ok).toBe(true);
    expect(checkCardioAdjust(15, ctx).ok).toBe(false);
    expect(checkCardioAdjust(-25, ctx).ok).toBe(false);
  });

  test('protein: coach never below 150, manual never below 100', () => {
    expect(checkProtein(145, false).ok).toBe(false);
    expect(checkProtein(145, true).ok).toBe(true);
    expect(checkProtein(90, true).ok).toBe(false);
  });

  test('manual base kcal respects the floor', () => {
    expect(checkBaseKcal(1650, 0, false).ok).toBe(false);
    expect(checkBaseKcal(1900, -150, false).ok).toBe(true);
  });

  test('doctor clearance relaxes but does not remove limits', () => {
    expect(checkKcalAdjust(-300, { ...ctx, doctorCleared: true }).ok).toBe(true);
    expect(checkKcalAdjust(-500, { ...ctx, doctorCleared: true }).ok).toBe(false);
  });

  test('forbidden advice filter', () => {
    expect(containsForbiddenAdvice('Try HIIT sprints')).toBe(true);
    expect(containsForbiddenAdvice('A fat burner can help')).toBe(true);
    expect(containsForbiddenAdvice('Walk 20 minutes after dinner')).toBe(false);
  });
});

describe('joint safety (5.4)', () => {
  test.each([
    ['Behind the neck press', 'shoulder'],
    ['Bench dips', 'shoulder'],
    ['Dumbbell flyes', 'shoulder'],
    ['Upright row', 'shoulder'],
    ['Barbell overhead press', 'shoulder'],
    ['Box jumps', 'knee'],
    ['Treadmill running', 'knee'],
    ['Walking lunges', 'knee'],
    ['Leg extension', 'knee'],
  ])('%s is blocked', (name, joint) => {
    const r = checkExerciseSafety(name);
    expect(r.blocked).toBe(true);
    expect(r.joint).toBe(joint);
  });

  test('every built-in exercise and alternative passes', () => {
    for (const e of ALL_EXERCISES) {
      expect(checkExerciseSafety(e.name).blocked).toBe(false);
      for (const a of e.alt) expect(checkExerciseSafety(altDisplayName(a)).blocked).toBe(false);
    }
  });
});

describe('migrations', () => {
  test('v1 data upgrades and keeps logs', () => {
    const old: any = { ...defaultData(), schemaVersion: 1, dayLogs: { '2026-10-01': { meals: {}, water: 3 } } };
    delete old.coachChat;
    delete old.settings.restricted;
    const m = migrate(old);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.coachChat).toEqual([]);
    expect(m.settings.restricted).toEqual({ shoulder: false, knee: false });
    expect(m.dayLogs['2026-10-01'].water).toBe(3);
  });

  test('garbage input gives defaults', () => {
    expect(migrate(null).profile.name).toBe('MG');
  });
});

describe('validateChange', () => {
  const vctx = { ...ctx, kcalAdjust: 0 };
  test('routes to the right limit', () => {
    expect(validateChange('stepsAdjust', 2500, vctx).ok).toBe(false);
    expect(validateChange('kcalAdjust', -300, vctx).ok).toBe(false);
    expect(validateChange('cardioAdjust', 5, vctx).ok).toBe(true);
    expect(validateChange('proteinTarget', 140, vctx).ok).toBe(false);
    expect(validateChange('proteinTarget', 140, vctx, true).ok).toBe(true);
    expect(validateChange('baseKcalRest', 1600, vctx).ok).toBe(false);
    expect(validateChange('deloadUntil', '2026-11-01', vctx).ok).toBe(true);
  });
});

describe('AI change parsing', () => {
  test('extracts an allowed change', () => {
    const r = parseChange('Walk more.\nCHANGE: {"type":"stepsAdjust","value":1500,"reason":"above band"}', '2026-10-10');
    expect(r.text).toBe('Walk more.');
    expect(r.proposal?.apply).toEqual([{ type: 'stepsAdjust', value: 1500 }]);
  });
  test('ignores disallowed types', () => {
    expect(parseChange('CHANGE: {"type":"fasting","value":1}', '2026-10-10').proposal).toBeNull();
  });
});
