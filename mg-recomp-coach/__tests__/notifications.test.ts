import { toISO } from '../src/engine/dates';
import { defaultData } from '../src/engine/defaults';
import { buildSchedule } from '../src/services/notifications';

const now = new Date(2026, 9, 11, 6, 0); // Sunday 06:00 local
const data = () => {
  const d = defaultData();
  d.profile = { ...d.profile, onboarded: true, startDate: toISO(now) };
  return d;
};

describe('reminder schedule (section 10)', () => {
  test('14 days of reminders with the planned meal name', () => {
    const s = buildSchedule(data(), now);
    const breakfasts = s.filter((p) => p.title === 'Breakfast');
    expect(breakfasts).toHaveLength(14);
    expect(breakfasts[0].body).toMatch(/^Oats bowl/); // Sunday B3
    expect(breakfasts[1].body).toMatch(/^Foul plate/); // Monday B1
  });

  test('gym reminder only on gym days, weekly review on Sundays', () => {
    const s = buildSchedule(data(), now);
    for (const p of s.filter((x) => x.title === 'Gym time')) expect([2, 5, 6]).toContain(p.at.getDay());
    expect(s.filter((x) => x.title === 'Gym time')).toHaveLength(6);
    expect(s.filter((x) => x.title === 'Weekly review').every((x) => x.at.getDay() === 0 && x.at.getHours() === 20)).toBe(true);
  });

  test('water nudges never stack on another reminder', () => {
    const d = data();
    d.settings.reminders.water.enabled = true;
    const s = buildSchedule(d, now);
    const water = s.filter((p) => p.title === 'Water');
    expect(water.length).toBeGreaterThan(0);
    expect(water.some((p) => p.at.getHours() === 11 && p.at.getMinutes() === 30)).toBe(false); // clashes with the work snack
  });

  test('snooze skips everything in the next 24 hours', () => {
    const d = data();
    d.settings.snoozeUntil = now.getTime() + 24 * 3600 * 1000;
    const s = buildSchedule(d, now);
    expect(s.every((p) => p.at.getTime() > d.settings.snoozeUntil!)).toBe(true);
    expect(s.length).toBeGreaterThan(0);
  });

  test('disabled reminders are not scheduled', () => {
    const d = data();
    d.settings.reminders.bedtime.enabled = false;
    expect(buildSchedule(d, now).some((p) => p.title === 'Bedtime')).toBe(false);
  });
});
