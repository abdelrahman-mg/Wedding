import { useState } from 'react';
import { HARD_LIMITS } from '../data/phases';
import { todayISO } from '../engine/dates';
import { validateChange } from '../engine/limits';
import { plannedTotals } from '../engine/nutrition';
import { weekFor } from '../engine/selectors';
import { cardioTarget, stepTarget } from '../engine/targets';
import type { ChangeType } from '../engine/types';
import { limitCtxFor } from '../features/limitCtx';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Field, num, Row, Screen, SectionTitle, Stepper, T } from '../ui/kit';

export default function Targets() {
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const today = todayISO();
  const week = Math.min(12, weekFor(data, today));
  const [err, setErr] = useState<string | null>(null);
  const [gym, setGym] = useState(data.adjust.baseKcalGym != null ? String(data.adjust.baseKcalGym) : '');
  const [rest, setRest] = useState(data.adjust.baseKcalRest != null ? String(data.adjust.baseKcalRest) : '');
  const a = data.adjust;

  const change = (type: ChangeType, value: number | null) => {
    const r = validateChange(type, value, limitCtxFor(data, today), true);
    if (!r.ok) {
      setErr(r.reason ?? 'Outside the hard limits.');
      return;
    }
    setErr(null);
    st.applyChange(type, value, 'Manual edit in Targets', today);
  };

  return (
    <Screen>
      {!data.settings.doctorCleared ? (
        <Banner tone="info" text={`Hard limits active: at least ${HARD_LIMITS.kcalFloor.toLocaleString('en-US')} kcal average, max ${HARD_LIMITS.stepsMax.toLocaleString('en-US')} steps, max ${HARD_LIMITS.cardioMax} min cardio.`} />
      ) : (
        <Banner tone="warning" text="Doctor clearance confirmed: some limits are relaxed. Change slowly." />
      )}
      {err ? <Banner tone="danger" text={err} /> : null}

      <SectionTitle>Protein</SectionTitle>
      <Card>
        <Stepper label="Daily protein" value={a.proteinTarget} step={5} min={100} max={250} onChange={(v) => change('proteinTarget', v)} format={(n) => `${n} g`} />
        <T v="caption" muted>Target 160 g (150-175 is fine). The coach never sets it below 150.</T>
      </Card>

      <SectionTitle>Calories</SectionTitle>
      <Card>
        <T>
          Plan today: gym day about {plannedTotals(data.plan, 1, true).kcal.toLocaleString('en-US')} kcal, rest day about{' '}
          {plannedTotals(data.plan, 0, false).kcal.toLocaleString('en-US')} kcal (from your meals).
        </T>
        <Stepper label="Coach kcal adjustment" value={a.kcalAdjust} step={50} min={-500} max={500} onChange={(v) => change('kcalAdjust', v)} format={(n) => `${n > 0 ? '+' : ''}${n}`} />
        <Row>
          <Field label="Base kcal gym days" value={gym} onChange={setGym} keyboard="number-pad" placeholder="from plan" />
          <Field label="Base kcal rest days" value={rest} onChange={setRest} keyboard="number-pad" placeholder="from plan" />
        </Row>
        <Row>
          <Button
            label="Save base kcal"
            small
            flex
            onPress={() => {
              const g = gym.trim() ? num(gym) : null;
              const r = rest.trim() ? num(rest) : null;
              const ctx = limitCtxFor(data, today);
              for (const [t, v] of [['baseKcalGym', g], ['baseKcalRest', r]] as const) {
                const res = validateChange(t, v, ctx, true);
                if (!res.ok) return setErr(res.reason ?? 'Not allowed.');
              }
              setErr(null);
              if (g !== a.baseKcalGym) st.applyChange('baseKcalGym', g, 'Manual edit in Targets', today);
              if (r !== a.baseKcalRest) st.applyChange('baseKcalRest', r, 'Manual edit in Targets', today);
            }}
          />
          <Button
            label="Use plan totals"
            small
            variant="ghost"
            flex
            onPress={() => {
              setGym('');
              setRest('');
              st.applyChange('baseKcalGym', null, 'Back to plan totals', today);
              st.applyChange('baseKcalRest', null, 'Back to plan totals', today);
            }}
          />
        </Row>
      </Card>

      <SectionTitle>Activity</SectionTitle>
      <Card>
        <Stepper label="Steps adjustment" value={a.stepsAdjust} step={500} min={-3000} max={6000} onChange={(v) => change('stepsAdjust', v)} format={(n) => `${n > 0 ? '+' : ''}${n}`} />
        <T v="caption" muted>This week: {stepTarget(week, a.stepsAdjust).toLocaleString('en-US')} steps/day.</T>
        <Stepper label="Cardio adjustment" value={a.cardioAdjust} step={5} min={-30} max={30} onChange={(v) => change('cardioAdjust', v)} format={(n) => `${n > 0 ? '+' : ''}${n} min`} />
        <T v="caption" muted>This week: {cardioTarget(week, a.cardioAdjust)} min per cardio day (15-45).</T>
      </Card>

      <SectionTitle>History</SectionTitle>
      {data.planChanges.length === 0 ? <T muted>No changes yet.</T> : null}
      {[...data.planChanges].reverse().slice(0, 30).map((p) => (
        <Card key={p.id} tone="alt" style={{ paddingVertical: 10 }}>
          <T v="label">
            {p.date} · {p.type}: {String(p.old ?? '–')} → {String(p.new ?? '–')}
            {p.undone ? ' (undone)' : ''}
          </T>
          <T v="caption" muted>{p.reason}</T>
        </Card>
      ))}
      {data.planChanges.some((p) => !p.undone) ? <Button label="Undo the most recent change" variant="ghost" onPress={() => st.undoLastChange()} /> : null}
    </Screen>
  );
}
