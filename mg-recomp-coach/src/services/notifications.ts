// Local scheduled notifications. No server, no push tokens.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMeal, type Slot } from '../data/meals';
import { addDays, dayOfWeek, parseISO, todayISO } from '../engine/dates';
import { dayContext } from '../engine/selectors';
import type { AppData, ReminderId } from '../engine/types';

type Channel = 'meals' | 'training' | 'checkins' | 'sleep';

const CHANNELS: Record<Channel, string> = {
  meals: 'Meals',
  training: 'Training',
  checkins: 'Check-ins',
  sleep: 'Sleep',
};

export const REMINDER_LABELS: Record<ReminderId, { label: string; channel: Channel; note?: string }> = {
  weighin: { label: 'Weigh-in', channel: 'checkins' },
  meal_B: { label: 'Breakfast', channel: 'meals' },
  meal_M: { label: 'Work snack', channel: 'meals' },
  meal_L: { label: 'Lunch', channel: 'meals' },
  meal_D: { label: 'Dinner', channel: 'meals' },
  meal_N: { label: 'Night snack', channel: 'meals' },
  gym: { label: 'Gym time (gym days)', channel: 'training' },
  checkin: { label: 'End-of-day check-in', channel: 'checkins' },
  bedtime: { label: 'Bedtime', channel: 'sleep' },
  review: { label: 'Weekly review (Sunday)', channel: 'checkins' },
  prep_fri: { label: 'Meal prep (Friday)', channel: 'meals' },
  prep_tue: { label: 'Meal prep (Tuesday)', channel: 'meals' },
  water: { label: 'Water (every 2.5 h, 09:00-20:00)', channel: 'meals', note: 'optional' },
};

let configured = false;

export async function setupNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    for (const [id, name] of Object.entries(CHANNELS)) {
      await Notifications.setNotificationChannelAsync(id, {
        name,
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200],
      });
    }
  }
}

export async function requestPermission(): Promise<boolean> {
  await setupNotifications();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export async function hasPermission(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

interface Planned {
  at: Date;
  title: string;
  body: string;
  channel: Channel;
  url?: string;
}

function at(dateIso: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = parseISO(dateIso);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Build the next 14 days of reminders from today's plan. Pure apart from Date.now(). */
export function buildSchedule(data: AppData, now: Date = new Date()): Planned[] {
  const r = data.settings.reminders;
  const out: Planned[] = [];
  const today = todayISO(now);
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dow = dayOfWeek(date);
    const ctx = dayContext(data, date);
    if (r.weighin.enabled) out.push({ at: at(date, r.weighin.time), title: 'Weigh in', body: 'After the toilet, before breakfast.', channel: 'checkins', url: '/' });
    for (const slot of ['B', 'M', 'L', 'D', 'N'] as Slot[]) {
      const key = `meal_${slot}` as ReminderId;
      const rem = r[key];
      if (!rem?.enabled) continue;
      const planned = ctx.slots.find((s) => s.slot === slot);
      const meal = planned ? getMeal(planned.mealId) : undefined;
      if (!meal) continue;
      out.push({ at: at(date, rem.time), title: REMINDER_LABELS[key].label, body: `${meal.name}: ${meal.kcal} kcal, ${meal.protein} g protein.`, channel: 'meals', url: '/' });
    }
    if (r.gym.enabled && ctx.session) {
      out.push({ at: at(date, r.gym.time), title: 'Gym time', body: 'Tired? Do the 30-minute minimum version.', channel: 'training', url: '/gym' });
    }
    if (r.checkin.enabled) out.push({ at: at(date, r.checkin.time), title: 'End-of-day check-in', body: 'Two minutes: score, protein gap, tomorrow.', channel: 'checkins', url: '/checkin' });
    if (r.bedtime.enabled) out.push({ at: at(date, r.bedtime.time), title: 'Bedtime', body: 'Screens down. Lights off by 23:30.', channel: 'sleep' });
    if (r.review.enabled && dow === 0) out.push({ at: at(date, r.review.time), title: 'Weekly review', body: 'Your week is in. See what the data says.', channel: 'checkins', url: '/me?tab=coach' });
    if (r.prep_fri.enabled && dow === 5) out.push({ at: at(date, r.prep_fri.time), title: 'Meal prep', body: 'Friday prep covers Fri-Mon: chicken, rice, eggs, soup.', channel: 'meals', url: '/prep' });
    if (r.prep_tue.enabled && dow === 2) out.push({ at: at(date, r.prep_tue.time), title: 'Meal prep', body: 'Tuesday prep covers Tue-Thu and Saturday.', channel: 'meals', url: '/prep' });
    if (r.water.enabled) {
      for (const t of ['09:00', '11:30', '14:00', '16:30', '19:00']) {
        out.push({ at: at(date, t), title: 'Water', body: 'One glass now. Goal: 10 today.', channel: 'meals' });
      }
    }
  }
  // Quiet handling: drop a water nudge that lands within 20 minutes of any other reminder.
  const others = out.filter((p) => p.title !== 'Water').map((p) => p.at.getTime());
  const quiet = out.filter((p) => p.title !== 'Water' || !others.some((t) => Math.abs(t - p.at.getTime()) < 20 * 60000));
  const snooze = data.settings.snoozeUntil ?? 0;
  return quiet.filter((p) => p.at.getTime() > now.getTime() + 30000 && p.at.getTime() > snooze);
}

let running: Promise<void> | null = null;

/** Cancel everything and schedule again. Called on app open and after plan/settings changes. */
export function rescheduleAll(data: AppData): Promise<void> {
  const job = async () => {
    try {
      if (!data.profile.onboarded || !(await hasPermission())) return;
      await setupNotifications();
      await Notifications.cancelAllScheduledNotificationsAsync();
      const plan = buildSchedule(data);
      for (const p of plan) {
        await Notifications.scheduleNotificationAsync({
          content: { title: p.title, body: p.body, data: p.url ? { url: p.url } : {} },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: p.channel },
        });
      }
    } catch (e) {
      console.warn('Notification scheduling failed', e);
    }
  };
  running = (running ?? Promise.resolve()).then(job);
  return running;
}
