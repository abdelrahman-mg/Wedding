import { expectedWeight, stepTarget, cardioTarget, weightBand } from '../src/engine/targets';

describe('target weight path (0.3-0.7 kg a week)', () => {
  test.each(Array.from({ length: 12 }, (_, i) => i + 1))('t=%i', (t) => {
    expect(expectedWeight(t, 110)).toBeCloseTo(110 - 0.5 * t, 5);
    const b = weightBand(t, 110);
    expect(b.low).toBeCloseTo(110 - 0.7 * t, 5);
    expect(b.high).toBeCloseTo(110 - 0.3 * t, 5);
  });

  test('examples', () => {
    expect(expectedWeight(4, 110)).toBeCloseTo(108);
    expect(expectedWeight(12, 110)).toBeCloseTo(104);
  });

  test('uses the editable start weight', () => {
    expect(expectedWeight(2, 104)).toBeCloseTo(103);
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
