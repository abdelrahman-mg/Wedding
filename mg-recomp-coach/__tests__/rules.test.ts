import { expectedWeight } from '../src/engine/targets';
import { bpStatus, painStatus, weeklyReview, type ReviewCtx, type WeekStats } from '../src/engine/rules';

const W0 = 110;

function wk(week: number, offset: number, daysOnPlan = 7, extra: Partial<WeekStats> = {}): WeekStats {
  return {
    weekStart: `2026-W${week}`,
    week,
    avgWeight: Math.round((expectedWeight(week, W0) + offset) * 100) / 100,
    weighIns: 7,
    waist: null,
    daysOnPlan,
    adherence: daysOnPlan / 7,
    avgSteps: 8000,
    avgSleep: 7,
    avgEnergy: 3,
    avgHunger: 3,
    workouts: { full: 4, minimum: 0, walk: 0, credit: 4 },
    painFlags: 0,
    holiday: false,
    ...extra,
  };
}

const ctx = (over: Partial<ReviewCtx> = {}): ReviewCtx => ({
  w0: W0,
  currentWeek: 6,
  stepsAdjust: 0,
  kcalAdjust: 0,
  planAvgKcal: 1956,
  doctorCleared: false,
  ...over,
});

describe('weight vs band (6.2)', () => {
  test('inside band: no change', () => {
    const r = weeklyReview([wk(4, 0.5), wk(5, 1.0)], ctx());
    expect(r.status).toBe('onTrack');
    expect(r.proposals).toHaveLength(0);
  });

  test('above band 2 weeks, adherence 90%, steps below 12,000: steps +1,500', () => {
    // 13 of 14 days = 93%
    const r = weeklyReview([wk(4, 2, 6), wk(5, 2.2, 7)], ctx({ currentWeek: 6 }));
    expect(r.status).toBe('above');
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0].apply).toEqual([{ type: 'stepsAdjust', value: 1500 }]);
  });

  test('steps increase is capped at 12,000 total', () => {
    // week 11 base is 11,000: only +1,000 allowed
    const r = weeklyReview([wk(9, 2, 7), wk(10, 2, 7)], ctx({ currentWeek: 11 }));
    expect(r.proposals[0].apply).toEqual([{ type: 'stepsAdjust', value: 1000 }]);
  });

  test('above band at 12,000 steps: kcal -150', () => {
    const r = weeklyReview([wk(4, 2, 7), wk(5, 2, 6)], ctx({ currentWeek: 6, stepsAdjust: 2000 }));
    expect(r.proposals[0].apply).toEqual([{ type: 'kcalAdjust', value: -150 }]);
  });

  test('above band with adherence 60%: no cuts, fixes instead', () => {
    const r = weeklyReview([wk(4, 2, 4), wk(5, 2, 4)], ctx()); // 8/14 = 57%
    expect(r.status).toBe('aboveLowAdherence');
    expect(r.proposals).toHaveLength(0);
    expect(r.messages.join(' ')).toMatch(/Meal prep/);
  });

  test('adherence 70-85%: mild message, no change', () => {
    const r = weeklyReview([wk(4, 2, 5), wk(5, 2, 6)], ctx()); // 11/14 = 79%
    expect(r.status).toBe('aboveMidAdherence');
    expect(r.proposals).toHaveLength(0);
  });

  test('above band only one week: no change', () => {
    const r = weeklyReview([wk(4, 0), wk(5, 2)], ctx());
    expect(r.status).toBe('aboveOneWeek');
    expect(r.proposals).toHaveLength(0);
  });

  test('below band: +200 kcal', () => {
    const r = weeklyReview([wk(4, -0.5), wk(5, -1.8)], ctx());
    expect(r.status).toBe('below');
    expect(r.proposals[0].apply).toEqual([{ type: 'kcalAdjust', value: 200 }]);
  });

  test('losing > 1.3 kg/week for 2 weeks: +200 kcal', () => {
    const weeks = [
      { ...wk(3, 0), avgWeight: 106 },
      { ...wk(4, 0), avgWeight: 104.5 },
      { ...wk(5, 0), avgWeight: 103.1 },
    ];
    const r = weeklyReview(weeks, ctx());
    expect(r.status).toBe('fastLoss');
    expect(r.proposals[0].apply).toEqual([{ type: 'kcalAdjust', value: 200 }]);
  });

  test('1,700 kcal floor blocks further cuts', () => {
    const r1 = weeklyReview([wk(4, 2), wk(5, 2)], ctx({ stepsAdjust: 2000, planAvgKcal: 1800 }));
    expect(r1.status).toBe('limitsReached');
    expect(r1.proposals).toHaveLength(0);
    // Already cut once: -300 would pass the -250 limit.
    const r2 = weeklyReview([wk(4, 2), wk(5, 2)], ctx({ stepsAdjust: 2000, kcalAdjust: -150 }));
    expect(r2.status).toBe('limitsReached');
    expect(r2.messages[0]).toMatch(/doctor/);
  });

  test('weeks 1-2 only report', () => {
    const r = weeklyReview([wk(1, 3), wk(2, 3)], ctx({ currentWeek: 3 }));
    expect(r.status).toBe('learning');
    expect(r.proposals).toHaveLength(0);
  });

  test('fewer than 3 weigh-ins: ask for more', () => {
    const r = weeklyReview([wk(4, 0), { ...wk(5, 0), avgWeight: null, weighIns: 2 }], ctx());
    expect(r.status).toBe('needData');
  });

  test('waist down with weight in band: recomposition message', () => {
    const r = weeklyReview([wk(3, 0, 7, { waist: 112 }), wk(4, 0, 7, { waist: 111.5 }), wk(5, 0.5, 7, { waist: 110.8 })], ctx());
    expect(r.messages.join(' ')).toMatch(/recomposition is working/);
  });

  test('metrics: rate, distance and projection', () => {
    const weeks = [
      { ...wk(4, 0), avgWeight: 106 },
      { ...wk(5, 0), avgWeight: 105 },
      { ...wk(6, 0), avgWeight: 104 },
    ];
    const r = weeklyReview(weeks, ctx({ currentWeek: 7 }));
    expect(r.metrics.ratePerWeek).toBe(1);
    expect(r.metrics.projectedWeek12).toBe(98);
    expect(r.metrics.distanceFromBand).toBeCloseTo(104 - expectedWeight(6, W0), 1);
  });

  test('holiday week pauses the band check', () => {
    const r = weeklyReview([wk(4, 2), wk(5, 2, 7, { holiday: true })], ctx());
    expect(r.status).toBe('holiday');
    expect(r.proposals).toHaveLength(0);
  });
});

describe('safety triggers (6.4)', () => {
  test('pain: 2 sessions within 14 days refers to a specialist', () => {
    const flags = [
      { id: '1', date: '2026-10-01', bodyPart: 'shoulder' as const },
      { id: '2', date: '2026-10-10', bodyPart: 'shoulder' as const },
      { id: '3', date: '2026-09-01', bodyPart: 'knee' as const },
      { id: '4', date: '2026-10-10', bodyPart: 'knee' as const },
    ];
    const s = painStatus(flags, '2026-10-12');
    expect(s.find((x) => x.part === 'shoulder')!.refer).toBe(true);
    expect(s.find((x) => x.part === 'knee')!.refer).toBe(false);
  });

  test('BP: 3 readings at or above 130/80 means doctor soon; 180/120 is urgent', () => {
    const e = (d: string, s: number, di: number, symptoms = false) => ({ id: d, date: d, systolic: s, diastolic: di, time: 'morning' as const, symptoms });
    expect(bpStatus([e('2026-10-01', 135, 85), e('2026-10-02', 132, 82), e('2026-10-03', 128, 81)]).level).toBe('doctorSoon');
    expect(bpStatus([e('2026-10-01', 135, 85), e('2026-10-02', 120, 75), e('2026-10-03', 128, 81)]).level).toBe('elevated');
    expect(bpStatus([e('2026-10-01', 182, 100)]).level).toBe('urgent');
    expect(bpStatus([e('2026-10-01', 140, 90, true)]).level).toBe('urgent');
    expect(bpStatus([]).level).toBe('none');
  });
});
