// "Watch tutorial" links, keyed by exercise id.
// Paste your own URL between the quotes. Empty ones open a YouTube search for that exercise instead.
import type { ExerciseDef } from './sessions';

export const TUTORIAL_URLS: Record<string, string> = {
  squat: '',
  rdl: '',
  leg_press: '',
  plank: '',
  bench: '',
  ohp: '',
  barbell_row: '',
  biceps_curl: '',
  triceps_pushdown: '',
  deadlift: '',
  light_squat: '',
  light_bench: '',
  lat_pulldown: '',
};

export function tutorialUrl(def: Pick<ExerciseDef, 'id' | 'name'>, nameUsed?: string): string {
  const own = TUTORIAL_URLS[def.id];
  if (own && !nameUsed) return own;
  if (own && nameUsed === def.name) return own;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nameUsed ?? def.name} proper form tutorial`)}`;
}

export function hasOwnTutorial(def: Pick<ExerciseDef, 'id'>): boolean {
  return !!TUTORIAL_URLS[def.id];
}
