// Optional AI coach. Off by default. Only runs when the user saves their own API key
// and presses Send. Sends a compact 14-day summary to the Anthropic Messages API.
import * as SecureStore from 'expo-secure-store';
import { addDays } from '../engine/dates';
import { containsForbiddenAdvice } from '../engine/limits';
import { planAverageKcal } from '../engine/nutrition';
import { daySummary, runReview } from '../engine/selectors';
import type { Proposal } from '../engine/rules';
import type { AppData, ISODate } from '../engine/types';

const ALLOWED = ['stepsAdjust', 'kcalAdjust', 'cardioAdjust', 'proteinTarget'] as const;

/** Pull an optional CHANGE line out of the reply and turn it into a proposal card. */
export function parseChange(text: string, today: ISODate): { text: string; proposal: Proposal | null } {
  const m = text.match(/^CHANGE:\s*(\{.*\})\s*$/m);
  if (!m) return { text, proposal: null };
  const clean = text.replace(m[0], '').trim();
  try {
    const j = JSON.parse(m[1]);
    if (!ALLOWED.includes(j.type) || typeof j.value !== 'number') return { text: clean, proposal: null };
    return {
      text: clean,
      proposal: {
        id: `${today}:ai:${j.type}:${j.value}`,
        title: 'AI coach suggestion',
        reason: String(j.reason ?? 'Suggested by the AI coach.'),
        change: `${j.type} → ${j.value}`,
        apply: [{ type: j.type, value: j.value }],
      },
    };
  } catch {
    return { text: clean, proposal: null };
  }
}

const KEY = 'anthropic_api_key';
export const AI_MODEL = 'claude-sonnet-5-5';

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string | null) {
  if (key) await SecureStore.setItemAsync(KEY, key.trim());
  else await SecureStore.deleteItemAsync(KEY);
}

export function buildSummary(data: AppData, today: ISODate) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -13 + i)).filter(
    (d) => !data.profile.startDate || d >= data.profile.startDate,
  );
  const review = runReview(data, today);
  return {
    user: {
      name: data.profile.name,
      sex: 'male',
      age: data.profile.age,
      heightCm: data.profile.heightCm,
      startWeight: data.profile.startWeight,
      startWaist: data.profile.startWaist,
      constraints: [
        'True gym beginner, desk job',
        'Right shoulder dislocated 4 times: no behind-the-neck, dips, wide/deep flyes, upright rows, heavy overhead pressing',
        'Right knee partial ACL tear, surgery 8 years ago: no jumping, running, pivoting lunges, heavy end-range leg extensions',
        'Possible high blood pressure (not yet checked), possible insulin resistance, heavy snoring',
        'Egyptian food, dislikes fish, no food scale (cups, spoons, palms only)',
        'Hard limits: >= 1,700 kcal/day average, <= 12,000 steps, <= 45 min cardio, no HIIT/running/jumping, no supplements like fat burners',
      ],
    },
    targets: {
      planAvgKcal: planAverageKcal(data.plan),
      kcalAdjust: data.adjust.kcalAdjust,
      stepsAdjust: data.adjust.stepsAdjust,
      cardioAdjust: data.adjust.cardioAdjust,
      protein: data.adjust.proteinTarget,
    },
    days: days.map((d) => {
      const s = daySummary(data, d);
      const l = data.dayLogs[d];
      return {
        date: d,
        weight: data.body[d]?.weight ?? null,
        kcal: s.kcal,
        kcalTarget: s.ctx.kcalTarget,
        protein: s.protein,
        score: s.score.total,
        onPlan: s.onPlan,
        steps: l?.steps ?? null,
        sleep: l?.sleep ?? null,
        energy: l?.energy ?? null,
        workout: s.workout,
      };
    }),
    painFlags: data.painFlags.filter((p) => p.date >= days[0]).map((p) => ({ date: p.date, part: p.bodyPart, note: p.note })),
    bp: data.bp.slice(-5).map((b) => `${b.systolic}/${b.diastolic}`),
    rulesEngine: { status: review.status, headline: review.headline, messages: review.messages, proposals: review.proposals.map((p) => p.change), metrics: review.metrics },
  };
}

const SYSTEM = `You are a friendly, honest fitness and nutrition coach for MG, inside his offline coaching app.
Reply in short, direct, casual English (max ~180 words). Use cups, spoons, palms and piece counts, never grams of food.
Never suggest fish, fasting beyond normal meal gaps, extreme restriction, dehydration, laxatives, sweating-based weight loss,
HIIT, running, jumping, diet pills, fat burners, detox or "insulin" supplements. Respect the joint constraints.
Never present estimates as measurements; never promise results or dates.
If you think a plan change is needed, describe it, but say the user must apply it via the Coach cards
(the app only allows: stepsAdjust, kcalAdjust, cardioAdjust in 5-minute steps, protein >= 150, a 7-day deload), within the hard limits.
If (and only if) you recommend one concrete change, end with one line exactly like:
CHANGE: {"type":"stepsAdjust|kcalAdjust|cardioAdjust|proteinTarget","value":<new total adjustment number>,"reason":"<short reason>"}
Any chest pain, fainting, severe dizziness, unusual breathlessness or palpitations: tell him to stop and seek medical care (Egypt ambulance 123).`;

export async function askCoach(data: AppData, today: ISODate, question: string): Promise<string> {
  const key = await getApiKey();
  if (!key) throw new Error('No API key saved. Add one in Plan > Settings > AI coach.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 700,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: `My data (JSON):\n${JSON.stringify(buildSummary(data, today))}\n\nMy question: ${question}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('The API key was rejected. Check it in Settings.');
      if (res.status === 429) throw new Error('Rate limited. Try again in a minute.');
      throw new Error(`The AI coach returned an error (${res.status}). ${body.slice(0, 120)}`);
    }
    const json = await res.json();
    const text: string = (json.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
    if (!text) throw new Error('Empty reply from the AI coach.');
    if (containsForbiddenAdvice(text)) {
      return text + '\n\n[App note: part of this reply mentions something outside your plan’s safety rules (no HIIT, running, jumping, fat burners or detox). Ignore that part.]';
    }
    return text;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The request timed out. Check your connection.');
    if (e instanceof TypeError) throw new Error('No connection. The offline coach and the weekly report still work.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
