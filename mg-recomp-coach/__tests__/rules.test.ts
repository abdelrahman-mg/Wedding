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
    workouts: { full: 3, minimum: 0, walk: 0, credit: 3 },
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

const wa = (week: number, avg: number | null, daysOnPlan = 7, extra: Partial<WeekStats> = {}) => ({ ...wk(week, 0, daysOnPlan, extra), avgWeight: avg, weighIns: avg == null ? 1 : 7 });

describe('weekly check-in: 0.3-0.7 kg a week', () => {
  test('losing 0.5 kg vs the week before is on track', () => {
    const r = weeklyReview([wa(3, 108.5), wa(4, 108.0)], ctx());
    expect(r.status).toBe('onTrack');
    expect(r.proposals).toHaveLength(0);
    expect(r.metrics.ratePerWeek).toBe(0.5);
    expect(r.metrics.changeVsPrev).toBe(-0.5);
    expect(r.metrics.prevAvg).toBe(108.5);
  });

  test('the edges of the range are on track', () => {
    expect(weeklyReview([wa(3, 108.3), wa(4, 108.0)], ctx()).status).toBe('onTrack');
    expect(weeklyReview([wa(3, 108.7), wa(4, 108.0)], ctx()).status).toBe('onTrack');
  });

  test('losing faster than 0.7 kg suggests a little more food', () => {
    const r = weeklyReview([wa(3, 109.0), wa(4, 107.9)], ctx());
    expect(r.status).toBe('fastLoss');
    expect(r.proposals[0].apply).toEqual([{ type: 'kcalAdjust', value: 100 }]);
    expect(r.proposals[0].title).toMatch(/more/);
  });

  test('raising calories stacks on an existing adjustment', () => {
    const r = weeklyReview([wa(3, 109.0), wa(4, 107.9)], ctx({ kcalAdjust: -100 }));
    expect(r.proposals[0].apply).toEqual([{ type: 'kcalAdjust', value: 0 }]);
  });

  test('a bit slow (0.1-0.3 kg): no change', () => {
    const r = weeklyReview([wa(3, 108.5), wa(4, 108.3)], ctx());
    expect(r.status).toBe('slow');
    expect(r.proposals).toHaveLength(0);
  });

  test('one flat week is noise: no change', () => {
    const r = weeklyReview([wa(3, 108.5), wa(4, 108.5)], ctx());
    expect(r.status).toBe('slow');
    expect(r.proposals).toHaveLength(0);
    expect(r.messages.join(' ')).toMatch(/next week is flat too/);
  });

  test('flat for 2 weeks with good adherence suggests a small trim', () => {
    const r = weeklyReview([wa(3, 108.5), wa(4, 108.5), wa(5, 108.6)], ctx());
    expect(r.status).toBe('stalled');
    expect(r.proposals[0].apply).toEqual([{ type: 'kcalAdjust', value: -100 }]);
  });

  test('flat for 2 weeks with poor adherence: fix the basics, no cut', () => {
    const r = weeklyReview([wa(3, 108.5, 4), wa(4, 108.5, 4), wa(5, 108.6, 4)], ctx());
    expect(r.status).toBe('stalledLowAdherence');
    expect(r.proposals).toHaveLength(0);
  });

  test('the calorie floor blocks further trims', () => {
    const r1 = weeklyReview([wa(3, 108.5), wa(4, 108.5), wa(5, 108.6)], ctx({ planAvgKcal: 1750 }));
    expect(r1.status).toBe('limitsReached');
    expect(r1.proposals).toHaveLength(0);
    const r2 = weeklyReview([wa(3, 108.5), wa(4, 108.5), wa(5, 108.6)], ctx({ kcalAdjust: -200 }));
    expect(r2.status).toBe('limitsReached');
    expect(r2.messages[0]).toMatch(/doctor/);
  });

  test('weeks 1-2 only report', () => {
    const r = weeklyReview([wa(1, 109.0), wa(2, 109.5)], ctx({ currentWeek: 3 }));
    expect(r.status).toBe('learning');
    expect(r.proposals).toHaveLength(0);
  });

  test('the first week compares with the start weight', () => {
    const r = weeklyReview([wa(1, 109.5)], ctx({ currentWeek: 2 }));
    expect(r.metrics.prevAvg).toBe(110);
    expect(r.metrics.changeVsPrev).toBe(-0.5);
  });

  test('no weekly average: ask for more weigh-ins', () => {
    const r = weeklyReview([wa(4, 108.0), wa(5, null)], ctx());
    expect(r.status).toBe('needData');
  });

  test('waist down while the scale is slow: recomposition message', () => {
    const r = weeklyReview([wa(3, 108.6, 7, { waist: 112 }), wa(4, 108.4, 7, { waist: 111.5 }), wa(5, 108.2, 7, { waist: 110.8 })], ctx());
    expect(r.messages.join(' ')).toMatch(/recomposition is working/);
  });

  test('metrics: rate, expected path and projection', () => {
    const r = weeklyReview([wa(4, 108.0), wa(5, 107.5), wa(6, 107.0)], ctx({ currentWeek: 7 }));
    expect(r.metrics.ratePerWeek).toBe(0.5);
    expect(r.metrics.projectedWeek12).toBe(104);
    expect(r.metrics.distanceFromBand).toBeCloseTo(107 - expectedWeight(6, W0), 1);
    expect(r.metrics.bandLow).toBeCloseTo(110 - 0.7 * 6, 1);
    expect(r.metrics.bandHigh).toBeCloseTo(110 - 0.3 * 6, 1);
  });

  test('holiday week pauses the check', () => {
    const r = weeklyReview([wa(4, 108), wa(5, 108.4, 7, { holiday: true })], ctx());
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
