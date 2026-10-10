// Double progression per exercise (section 5.5). Pure functions.
import type { ExerciseDef } from '../data/sessions';
import { diffDays } from './dates';
import { roundLoad } from './phase';
import { epley } from './strength';
import type { ISODate, SetLog, WorkoutLog } from './types';

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
  rir: number | null;
}

export interface ExerciseSession {
  date: ISODate;
  deload: boolean;
  sets: LoggedSet[];
}

export type SuggestionKind = 'first' | 'addLoad' | 'hold' | 'reduce' | 'addRep' | 'topReached' | 'addTime' | 'addSet';

export interface Suggestion {
  kind: SuggestionKind;
  weight: number | null;
  targetReps: number;
  /** Suggested set count for timed exercises (adds a set at the top of the range, max 4). */
  sets: number | null;
  message: string;
  stall: boolean;
  stallMessage: string | null;
  stallWeight: number | null;
  suggestSwap: boolean;
  lastSummary: string | null;
}

export const FIRST_TIME_MESSAGE = 'Pick a weight you could lift about 12 times. Start the first set at RIR 3.';
export const STALL_MESSAGE =
  'No progress for 3 sessions. Check sleep, protein and calories first. Then drop the load 10% and rebuild.';

const MACHINE_RE = /machine|cable|press|pulldown|curl|abduction|pec-deck|smith|row/i;

function range(def: ExerciseDef): [number, number] {
  if (def.timed) return def.secs ?? [20, 40];
  return def.reps ?? [8, 12];
}

function isWeighted(s: ExerciseSession): boolean {
  return s.sets.some((x) => (x.weight ?? 0) > 0);
}

function topWeight(s: ExerciseSession): number {
  return Math.max(0, ...s.sets.map((x) => x.weight ?? 0));
}

/** Progress metric: best estimated strength for loaded work, total reps/seconds otherwise. */
export function sessionMetric(s: ExerciseSession): number {
  if (isWeighted(s)) return Math.max(...s.sets.map((x) => epley(x.weight ?? 0, x.reps ?? 0)));
  return s.sets.reduce((a, x) => a + (x.reps ?? 0), 0);
}

export function summarize(s: ExerciseSession, timed?: boolean): string {
  return s.sets
    .map((x) => {
      const unit = timed ? 's' : '';
      if (x.weight != null && x.weight > 0) return `${x.weight}x${x.reps ?? '-'}${unit}`;
      return `${x.reps ?? '-'}${unit}`;
    })
    .join(', ');
}

/** Sessions that count: non-deload with at least min(2, sets) logged working sets. */
export function qualifying(def: ExerciseDef, history: ExerciseSession[]): ExerciseSession[] {
  const need = Math.min(2, def.sets);
  return history.filter((s) => !s.deload && s.sets.filter((x) => x.reps != null).length >= need);
}

export function detectStall(sessions: ExerciseSession[]): { stall: boolean; suggestSwap: boolean } {
  if (sessions.length < 4) return { stall: false, suggestSwap: false };
  let best = -Infinity;
  let lastProgressDate = sessions[0].date;
  const n = sessions.length;
  for (let i = 0; i < n; i++) {
    const m = sessionMetric(sessions[i]);
    if (m > best) {
      best = m;
      lastProgressDate = sessions[i].date;
    }
  }
  // Best performance achieved before the last three sessions.
  let before = -Infinity;
  for (let i = 0; i < n - 3; i++) before = Math.max(before, sessionMetric(sessions[i]));
  const progressed = sessions.slice(n - 3).some((s) => sessionMetric(s) > before);
  const stall = !progressed;
  const suggestSwap = stall && diffDays(lastProgressDate, sessions[n - 1].date) >= 42;
  return { stall, suggestSwap };
}

export function suggestProgression(def: ExerciseDef, history: ExerciseSession[]): Suggestion {
  const [bottom, top] = range(def);
  const q = qualifying(def, history);
  const base: Suggestion = {
    kind: 'first',
    weight: null,
    targetReps: bottom,
    sets: null,
    message: FIRST_TIME_MESSAGE,
    stall: false,
    stallMessage: null,
    stallWeight: null,
    suggestSwap: false,
    lastSummary: null,
  };
  if (q.length === 0) {
    if (def.timed || def.bodyweight) {
      return { ...base, message: def.timed ? `First time: hold ${bottom} s with good form.` : `First time: ${bottom} clean reps.` };
    }
    return base;
  }

  const last = q[q.length - 1];
  const logged = last.sets.filter((x) => x.reps != null);
  const reps = logged.map((x) => x.reps as number);
  const lastSummary = `${summarize(last, def.timed)}`;
  const { stall, suggestSwap } = detectStall(q);
  const withStall = (s: Suggestion): Suggestion => ({
    ...s,
    lastSummary,
    stall,
    suggestSwap,
    stallMessage: stall
      ? STALL_MESSAGE + (suggestSwap ? ' Stalled 6+ weeks: consider swapping to an alternative.' : '')
      : null,
    stallWeight: stall && s.weight ? Math.round(s.weight * 0.9 * 2) / 2 : null,
  });

  // Timed exercises: +5 s per session up to the top, then add a set (max 4).
  if (def.timed) {
    const minSecs = Math.min(...reps);
    const count = logged.length;
    if (reps.every((r) => r >= top)) {
      const sets = Math.min(4, count + 1);
      return withStall({
        ...base,
        kind: 'addSet',
        targetReps: top,
        sets,
        message: sets > count ? `Top of the range on every set. Add a set: ${sets} x ${top} s.` : `Maxed out: ${sets} x ${top} s. Keep it strict.`,
      });
    }
    const target = Math.min(top, minSecs + 5);
    return withStall({ ...base, kind: 'addTime', targetReps: target, sets: count, message: `Add 5 s: aim for ${target} s on each set.` });
  }

  const weighted = isWeighted(last);
  const weight = weighted ? topWeight(last) : null;
  const allTop = reps.every((r) => r >= top);
  const allRirOk = logged.every((x) => x.rir == null || x.rir >= 2);
  const anyBelow = reps.some((r) => r < bottom);

  // Bodyweight (no load): progress reps first.
  if (!weighted) {
    if (allTop) {
      return withStall({ ...base, kind: 'topReached', targetReps: top, message: 'Top of the range on every set. Slow the tempo or add a 2 s pause at the hardest point.' });
    }
    const target = Math.min(top, Math.min(...reps) + 1);
    return withStall({ ...base, kind: 'addRep', targetReps: target, message: `Try +1 rep on any set (aim for ${target}).` });
  }

  if (allTop && allRirOk) {
    const inc = def.lower ? 5 : 2.5;
    const next = roundLoad((weight as number) + inc);
    const machine = MACHINE_RE.test(def.name) ? ' On a machine: move to the next pin.' : '';
    return withStall({
      ...base,
      kind: 'addLoad',
      weight: next,
      targetReps: bottom,
      message: `All sets hit ${top} at RIR 2+. Add ${inc} kg: ${next} kg x ${bottom}.${machine}`,
    });
  }

  if (anyBelow) {
    const prev = q.length >= 2 ? q[q.length - 2] : null;
    const prevBelow = prev ? prev.sets.some((x) => x.reps != null && (x.reps as number) < bottom) : false;
    if (prevBelow) {
      const reduced = Math.round((weight as number) * 0.925 * 2) / 2;
      return withStall({
        ...base,
        kind: 'reduce',
        weight: reduced,
        targetReps: bottom,
        message: `Below ${bottom} reps two sessions in a row. Drop to ${reduced} kg (about 7.5% less) and rebuild with clean form.`,
      });
    }
    return withStall({
      ...base,
      kind: 'hold',
      weight,
      targetReps: bottom,
      message: `Some sets were below ${bottom}. Keep ${weight} kg and aim for ${bottom} clean reps.`,
    });
  }

  const target = Math.min(top, Math.min(...reps) + 1);
  return withStall({ ...base, kind: 'addRep', weight, targetReps: target, message: `Same ${weight} kg. Try +1 rep on any set (aim for ${target}).` });
}

/** Build per-exercise history from workout logs, keyed by the name actually used. */
export function historyFor(workouts: WorkoutLog[], nameUsed: string, beforeId?: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  const sorted = [...workouts].sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1));
  for (const w of sorted) {
    if (beforeId && w.id === beforeId) continue;
    if (w.kind === 'walk') continue;
    const sets = w.sets.filter((s: SetLog) => s.nameUsed === nameUsed && s.done);
    if (sets.length === 0) continue;
    out.push({ date: w.date, deload: w.deload, sets: sets.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })) });
  }
  return out;
}

/** Personal record check: top weight, or top reps at the same weight, beats all previous. */
export function isPR(current: ExerciseSession, previous: ExerciseSession[]): boolean {
  if (previous.length === 0) return false;
  const curTop = topWeight(current);
  const prevTop = Math.max(0, ...previous.map(topWeight));
  if (curTop > prevTop) return true;
  if (curTop === prevTop) {
    const curReps = Math.max(0, ...current.sets.filter((s) => (s.weight ?? 0) === curTop).map((s) => s.reps ?? 0));
    const prevReps = Math.max(
      0,
      ...previous.flatMap((p) => p.sets.filter((s) => (s.weight ?? 0) === prevTop).map((s) => s.reps ?? 0)),
    );
    return curReps > prevReps;
  }
  return false;
}

/** "Strength drop": top set load or total reps lower than the previous session. */
export function droppedVsPrevious(prev: ExerciseSession, cur: ExerciseSession): boolean {
  const pt = topWeight(prev);
  const ct = topWeight(cur);
  if (ct < pt) return true;
  if (ct === pt) {
    const pr = prev.sets.reduce((a, s) => a + (s.reps ?? 0), 0);
    const cr = cur.sets.reduce((a, s) => a + (s.reps ?? 0), 0);
    return cr < pr;
  }
  return false;
}
