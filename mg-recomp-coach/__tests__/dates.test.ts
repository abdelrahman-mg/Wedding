import { addDays, dayOfWeek, diffDays, programWeek, roadmapWeek, statsWeekNumber, toISO, weekDates, weekStart } from '../src/engine/dates';

describe('date helpers', () => {
  test('toISO uses local calendar components', () => {
    expect(toISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toISO(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  test('addDays crosses months, years and DST dates', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // EU DST change weekend
    expect(addDays('2026-04-24', 7)).toBe('2026-05-01'); // Egypt DST start (last Friday of April)
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('diffDays', () => {
    expect(diffDays('2026-10-01', '2026-10-11')).toBe(10);
    expect(diffDays('2026-10-11', '2026-10-01')).toBe(-10);
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
  });

  test('day of week: 0 = Sunday', () => {
    expect(dayOfWeek('2026-10-11')).toBe(0); // Sunday
    expect(dayOfWeek('2026-10-10')).toBe(6); // Saturday
    expect(dayOfWeek('2026-10-12')).toBe(1);
  });

  test('Sunday-to-Saturday weeks', () => {
    expect(weekStart('2026-10-10')).toBe('2026-10-04');
    expect(weekStart('2026-10-11')).toBe('2026-10-11');
    expect(weekStart('2026-10-14')).toBe('2026-10-11');
    const w = weekDates('2026-10-11');
    expect(w[0]).toBe('2026-10-11');
    expect(w[6]).toBe('2026-10-17');
    expect(dayOfWeek(w[6])).toBe(6);
  });

  test('program week from the start date', () => {
    const start = '2026-10-07'; // Wednesday
    expect(programWeek(start, '2026-10-06')).toBe(0);
    expect(programWeek(start, '2026-10-07')).toBe(1);
    expect(programWeek(start, '2026-10-13')).toBe(1);
    expect(programWeek(start, '2026-10-14')).toBe(2);
    expect(programWeek(start, '2026-12-29')).toBe(12);
    expect(programWeek(start, '2026-12-30')).toBe(13);
    expect(programWeek(start, '2027-01-20')).toBe(16);
    expect(roadmapWeek(start, '2027-01-20')).toBe(12);
  });

  test('stats week number uses the Saturday of the stats week', () => {
    const start = '2026-10-07';
    expect(statsWeekNumber(start, '2026-10-04')).toBe(1);
    expect(statsWeekNumber(start, '2026-10-11')).toBe(2);
  });
});
