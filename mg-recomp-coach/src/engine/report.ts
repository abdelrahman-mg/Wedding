// Weekly report as text for pasting into a chat (section 8.4).
import { addDays, formatShort } from './dates';
import { weekStats } from './selectors';
import { weightBand, stepTarget } from './targets';
import type { AppData, ISODate } from './types';

export function weeklyReport(data: AppData, sunday: ISODate): string {
  const s = weekStats(data, sunday);
  const prev = weekStats(data, addDays(sunday, -7));
  const end = addDays(sunday, 6);
  const t = Math.max(1, Math.min(12, s.week));
  const band = weightBand(t, data.profile.startWeight);
  const avg = s.avgWeight != null ? `${s.avgWeight.toFixed(1)} kg` : `not enough weigh-ins (${s.weighIns})`;
  const change =
    s.avgWeight != null && prev.avgWeight != null
      ? `${s.avgWeight - prev.avgWeight >= 0 ? '+' : ''}${(s.avgWeight - prev.avgWeight).toFixed(1)} kg`
      : 'n/a';
  const pain = data.painFlags.filter((p) => p.date >= sunday && p.date <= end);
  const reds = data.redFlags.filter((p) => p.date >= sunday && p.date <= end);
  const issues = [...pain.map((p) => `${p.bodyPart} (${p.date}${p.note ? `: ${p.note}` : ''})`), ...reds.map((r) => `${r.symptom} (${r.date})`)];
  const bp = data.bp.filter((b) => b.date >= sunday && b.date <= end);
  const changes = data.planChanges.filter((c) => c.date >= sunday && c.date <= end && !c.undone);
  const notes = Object.keys(data.dayLogs)
    .filter((d) => d >= sunday && d <= end && data.dayLogs[d].note)
    .sort()
    .map((d) => `${d}: ${data.dayLogs[d].note}`);
  const fmt = (n: number | null, suffix = '') => (n == null ? 'n/a' : `${n}${suffix}`);

  return [
    `Week ${s.week} report (${formatShort(sunday)} - ${formatShort(end)})`,
    `Average weight: ${avg} (change vs last week: ${change}), expected band: ${band.low.toFixed(1)}-${band.high.toFixed(1)} kg`,
    `Waist: ${s.waist != null ? `${s.waist} cm` : 'not measured'}`,
    `Workouts: ${s.workouts.full + s.workouts.minimum + s.workouts.walk} of 3 (full ${s.workouts.full} / minimum ${s.workouts.minimum} / walk ${s.workouts.walk})`,
    `Average steps: ${s.avgSteps != null ? s.avgSteps.toLocaleString('en-US') : 'n/a'} (target ${stepTarget(t, data.adjust.stepsAdjust).toLocaleString('en-US')})`,
    `Days on plan: ${s.daysOnPlan} of 7`,
    `Hunger / energy / sleep: ${fmt(s.avgHunger)} / ${fmt(s.avgEnergy)} / ${fmt(s.avgSleep, ' hours')}`,
    `Pain or issues: ${issues.length ? issues.join('; ') : 'none'}`,
    `Blood pressure: ${bp.length ? bp.map((b) => `${b.systolic}/${b.diastolic}${b.pulse ? ` p${b.pulse}` : ''} (${b.date} ${b.time})`).join('; ') : 'no readings'}`,
    `Plan changes this week: ${changes.length ? changes.map((c) => `${c.type} ${c.old ?? '-'} -> ${c.new ?? '-'} (${c.reason})`).join('; ') : 'none'}`,
    `Notes: ${notes.length ? notes.join(' | ') : 'none'}`,
  ].join('\n');
}
