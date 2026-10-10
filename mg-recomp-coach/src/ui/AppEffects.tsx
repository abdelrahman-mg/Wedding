// Background effects while the app is open: notifications, badges, milestones, level-ups.
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { BADGES } from '../data/badges';
import { todayISO } from '../engine/dates';
import { evaluateBadges, streaksAndXp, totalLost, weekFor } from '../engine/selectors';
import { rescheduleAll } from '../services/notifications';
import { useApp } from '../store/useApp';
import { celebrate } from './celebrate';

function scheduleKey(): string {
  const d = useApp.getState().data;
  const overrides = Object.entries(d.dayLogs)
    .filter(([, l]) => l.sessionOverride)
    .map(([k, l]) => `${k}:${l.sessionOverride}`)
    .join(',');
  return JSON.stringify([d.profile.onboarded, d.plan, d.settings.reminders, d.settings.snoozeUntil, d.settings.holidayWeeks, d.adjust.deloadUntil, overrides, d.settings.demoMode]);
}

function checkAchievements() {
  const st = useApp.getState();
  const d = st.data;
  if (!d.profile.onboarded || !d.profile.startDate) return;
  const today = todayISO();
  const newBadges = evaluateBadges(d, today);
  if (newBadges.length) {
    st.awardBadges(newBadges, today);
    const b = BADGES.find((x) => x.id === newBadges[0]);
    if (b) celebrate({ kind: 'badge', title: `Badge: ${b.name}`, text: b.desc + (newBadges.length > 1 ? ` (+${newBadges.length - 1} more in Badges)` : '') });
  }
  const lost = totalLost(d, today);
  for (const kg of [2, 5, 10]) {
    const key = `lost_${kg}`;
    if (lost != null && lost >= kg && !d.celebrations[key]) {
      st.celebrate(key);
      celebrate({ kind: 'milestone', title: `${kg} kg down`, text: 'Weekly average, not a lucky weigh-in. That is real progress. Keep the plan.' });
    }
  }
  const week = weekFor(d, today);
  for (const mark of [5, 9, 13]) {
    const key = `weeks_${mark - 1}`;
    if (week >= mark && !d.celebrations[key]) {
      st.celebrate(key);
      celebrate({ kind: 'milestone', title: `${mark - 1} weeks done`, text: 'Take your progress photos (front, side, back) in Progress > Photos. Same light, same spot.' });
    }
  }
  const { level } = streaksAndXp(d, today);
  const key = `level_${level.level}`;
  if (level.level > 1 && !d.celebrations[key]) {
    st.celebrate(key);
    celebrate({ kind: 'level', title: `Level ${level.level}: ${level.title}`, text: 'Earned one day at a time.' });
  }
}

export function AppEffects() {
  const hydrated = useApp((s) => s.hydrated);
  const lastKey = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const run = (force = false) => {
      const k = scheduleKey();
      if (!force && k === lastKey.current) return;
      lastKey.current = k;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => rescheduleAll(useApp.getState().data), 1500);
    };
    run(true);
    checkAchievements();
    const unsub = useApp.subscribe(() => run());
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        run(true);
        checkAchievements();
      }
    });
    const ach = setInterval(checkAchievements, 60000);
    return () => {
      unsub();
      appSub.remove();
      clearInterval(ach);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hydrated]);

  // Tap a notification: open the matching screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const url = resp.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as any);
    });
    return () => sub.remove();
  }, []);

  // Re-check achievements whenever a workout is finished or a day changes.
  const workouts = useApp((s) => s.data.workouts.length);
  const bodyCount = useApp((s) => Object.keys(s.data.body).length);
  useEffect(() => {
    if (hydrated) checkAchievements();
  }, [workouts, bodyCount, hydrated]);

  return null;
}
