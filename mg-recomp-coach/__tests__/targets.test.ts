import { expectedWeight, stepTarget, cardioTarget, weightBand } from '../src/engine/targets';

describe('expected weight band (3.3)', () => {
  test.each(Array.from({ length: 12 }, (_, i) => i + 1))('t=%i follows the formula', (t) => {
    const e = 110 - (2.0 + 0.9 * (t - 1));
    expect(expectedWeight(t, 110)).toBeCloseTo(e, 5);
    const b = weightBand(t, 110);
    expect(b.low).toBeCloseTo(e - 1.5, 5);
    expect(b.high).toBeCloseTo(e + 1.5, 5);
  });

  test('brief examples', () => {
    expect(expectedWeight(2, 110)).toBeCloseTo(107.1);
    expect(expectedWeight(4, 110)).toBeCloseTo(105.3);
    expect(expectedWeight(6, 110)).toBeCloseTo(103.5);
    expect(expectedWeight(8, 110)).toBeCloseTo(101.7);
    expect(expectedWeight(10, 110)).toBeCloseTo(99.9);
    expect(expectedWeight(12, 110)).toBeCloseTo(98.1);
  });

  test('uses the editable start weight', () => {
    expect(expectedWeight(1, 104)).toBeCloseTo(102);
  });
});

describe('weekly targets', () => {
  test('step targets per week and cap at 12,000', () => {
    expect(stepTarget(1, 0)).toBe(6000);
    expect(stepTarget(6, 0)).toBe(10000);
    expect(stepTarget(12, 0)).toBe(12000);
    expect(stepTarget(11, 1500)).toBe(12000);
    expect(stepTarget(20, 0)).toBe(12000);
  });

  test('cardio stays between 15 and 45', () => {
    expect(cardioTarget(1, 0)).toBe(20);
    expect(cardioTarget(1, -10)).toBe(15);
    expect(cardioTarget(9, 5)).toBe(45);
  });
});
