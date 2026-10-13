// Demo mode: 4 weeks of fake logs so charts, the rules engine and badges can be tried.
// Clearly labeled in the UI. Real data is stashed and restored when demo mode is turned off.
import { SESSIONS } from '../data/sessions';
import { addDays, dayOfWeek, programWeek } from '../engine/dates';
import { defaultData } from '../engine/defaults';
import { workingSets } from '../engine/phase';
import { plannedSlots } from '../engine/nutrition';
import type { AppData, ISODate, SetLog, WorkoutLog } from '../engine/types';

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const START_LOADS: Record<string, number> = {
  squat: 40, rdl: 40, leg_press: 80, deadlift: 50,
  bench: 30, ohp: 20, barbell_row: 30, biceps_curl: 15, triceps_pushdown: 15, lat_pulldown: 30,
};

export function buildDemoData(today: ISODate): AppData {
  const r = rng(42);
  const d = defaultData();
  const start = addDays(today, -27);
  d.profile = { ...d.profile, startDate: start, onboarded: true };
  d.settings.demoMode = true;
  const loads: Record<string, number> = { ...START_LOADS };

  for (let i = 0; i <= 27; i++) {
    const date = addDays(start, i);
    const dow = dayOfWeek(date);
    const week = programWeek(start, date);
    const gymKey = d.plan.sessionDays[dow];
    const slots = plannedSlots(d.plan, dow);
    const meals: AppData['dayLogs'][string]['meals'] = {};
    for (const s of slots) {
      const x = r();
      if (x < 0.8) meals[s.slot] = { status: 'eaten', mealId: s.mealId };
      else if (x < 0.9 && s.slot === 'L') meals[s.slot] = { status: 'planB', mealId: 'E2' };
      else if (x < 0.95) meals[s.slot] = { status: 'custom', custom: { name: 'Shawarma sandwich', kcal: 550, protein: 30 } };
      else meals[s.slot] = { status: 'skipped' };
    }
    const stepBase = [6000, 7500, 8000, 8500][week - 1] ?? 8000;
    d.dayLogs[date] = {
      meals,
      water: 6 + Math.round(r() * 4),
      steps: Math.round(stepBase * (0.75 + r() * 0.4)),
      sleep: Math.round((5.8 + r() * 2) * 2) / 2,
      energy: 2 + Math.round(r() * 3),
      hunger: 2 + Math.round(r() * 2),
      oilMeasured: r() > 0.3,
      oilTsp: 3 + Math.round(r() * 2),
      cardioMinutes: gymKey ? undefined : [20, 20, 25, 30][week - 1] - (r() > 0.7 ? 10 : 0),
      cardioType: gymKey ? undefined : 'Incline walk',
    };
    // Weight: about 0.5 kg/week with daily noise.
    const trend = 110 - 0.5 - 0.5 * (i / 7);
    if (r() > 0.15) d.body[date] = { weight: Math.round((trend + (r() - 0.5) * 1.2) * 10) / 10 };
    if (dow === 0) d.body[date] = { ...(d.body[date] ?? {}), waist: Math.round((115 - 0.7 * (i / 7)) * 10) / 10 };

    if (gymKey && r() > 0.12) {
      const def = SESSIONS[gymKey];
      const sets: SetLog[] = [];
      for (const ex of def.exercises) {
        const n = workingSets(ex.sets, week, false);
        const main = ex.lightOf ? loads[ex.lightOf.id] : undefined;
        const load = ex.lightOf ? (main ? Math.round((main * ex.lightOf.pct) / 2.5) * 2.5 : undefined) : loads[ex.id];
        const top = ex.timed ? ex.secs![1] : ex.reps![1];
        const missed = r() > 0.8;
        let allHit = true;
        for (let k = 0; k < n; k++) {
          const reps = missed && k === n - 1 ? top - 1 : top;
          if (reps < top) allHit = false;
          sets.push({
            exerciseId: ex.id,
            nameUsed: ex.name,
            setIndex: k,
            weight: ex.bodyweight || ex.timed ? null : load ?? null,
            reps,
            rir: null,
            clean: true,
            done: true,
          });
        }
        if (!ex.lightOf && load != null && allHit) loads[ex.id] = load + ex.inc;
      }
      const w: WorkoutLog = {
        id: `demo-${date}`,
        date,
        sessionKey: gymKey,
        kind: r() > 0.85 ? 'minimum' : 'full',
        startedAt: new Date(date + 'T17:30:00').getTime(),
        durationMin: 50 + Math.round(r() * 20),
        feel: 3 + Math.round(r() * 2),
        deload: false,
        sets,
        finished: true,
        prs: i > 7 && r() > 0.6 ? [def.exercises[0].name] : [],
      };
      d.workouts.push(w);
    }
  }
  d.bp = [
    { id: 'bp1', date: addDays(today, -20), systolic: 138, diastolic: 86, pulse: 82, time: 'morning' },
    { id: 'bp2', date: addDays(today, -13), systolic: 134, diastolic: 84, pulse: 80, time: 'morning' },
    { id: 'bp3', date: addDays(today, -6), systolic: 131, diastolic: 82, pulse: 78, time: 'evening' },
  ];
  d.painFlags = [{ id: 'p1', date: addDays(today, -9), bodyPart: 'shoulder', note: 'Twinge on overhead press', exercise: 'Overhead press' }];
  d.planBCount = 6;
  return d;
}
