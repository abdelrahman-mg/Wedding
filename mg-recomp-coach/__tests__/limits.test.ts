import { ALL_EXERCISES, altDisplayName } from '../src/data/sessions';
import { checkBaseKcal, checkCardioAdjust, checkExerciseSafety, checkKcalAdjust, checkProtein, checkStepsAdjust, containsForbiddenAdvice, validateChange, type LimitCtx } from '../src/engine/limits';
import { defaultData, migrate, SCHEMA_VERSION } from '../src/engine/defaults';
import { parseChange } from '../src/services/aiCoach';

const ctx: LimitCtx = { planAvgKcal: 1956, doctorCleared: false, stepsBase: 10000, cardioBase: 35 };

describe('program lifts chosen by the user are allowed', () => {
  test.each(['Squat', 'Deadlift', 'Bench press', 'Overhead press', 'Barbell row', 'Romanian deadlift', 'Lat pulldown'])('%s is allowed', (name) => {
    expect(checkExerciseSafety(name).blocked).toBe(false);
  });
});

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
    ['Push press', 'shoulder'],
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

describe('migration v2 -> v3', () => {
  test('adds the entry feed', () => {
    const old: any = { ...defaultData(), schemaVersion: 2 };
    delete old.entries;
    expect(migrate(old).entries).toEqual([]);
  });
});

describe('migration v3 -> v4', () => {
  test('maps old sessions to the new program and resets days and swaps', () => {
    const old: any = { ...defaultData(), schemaVersion: 3 };
    old.plan = { ...old.plan, sessionDays: { 0: null, 1: 'UPPER_A', 2: null, 3: 'LOWER_A', 4: null, 5: 'UPPER_B', 6: 'LOWER_B' }, exerciseSwaps: { leg_press: 'Goblet box squat' } };
    old.workouts = [{ id: 'w', date: '2026-10-01', sessionKey: 'LOWER_A', kind: 'full', startedAt: 1, durationMin: 50, deload: false, sets: [], finished: true }];
    old.dayLogs = { '2026-10-02': { meals: {}, water: 0, sessionOverride: 'UPPER_B' } };
    const m = migrate(old);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.plan.sessionDays[5]).toBe('SQUAT');
    expect(m.plan.sessionDays[6]).toBe('BENCH');
    expect(m.plan.sessionDays[2]).toBe('DEADLIFT');
    expect(m.plan.sessionDays[1]).toBeNull();
    expect(m.plan.exerciseSwaps).toEqual({});
    expect(m.workouts[0].sessionKey).toBe('SQUAT');
    expect(m.dayLogs['2026-10-02'].sessionOverride).toBe('BENCH');
  });
});
