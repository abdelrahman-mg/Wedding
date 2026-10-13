import { useState } from 'react';
import { DAY_NAMES, DAYS, type DayOfWeek } from '../data/plan';
import { ALL_EXERCISES, altDisplayName, LIFT_SESSIONS, LOWER_SESSIONS, SESSIONS, type SessionKey } from '../data/sessions';
import { checkExerciseSafety } from '../engine/limits';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Chip, Field, Row, Screen, SectionTitle, T } from '../ui/kit';

export default function EditWorkouts() {
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const assign = (dow: DayOfWeek, key: SessionKey | null) => {
    if (key && LOWER_SESSIONS.includes(key)) {
      const prev = data.plan.sessionDays[((dow + 6) % 7) as DayOfWeek];
      const next = data.plan.sessionDays[((dow + 1) % 7) as DayOfWeek];
      if ((prev && LOWER_SESSIONS.includes(prev)) || (next && LOWER_SESSIONS.includes(next))) {
        setMsg('Never squat and deadlift on consecutive days. Move the other one first.');
        return;
      }
    }
    // Each session once a week: clear it from its old day.
    if (key) {
      for (const d of DAYS) if (d !== dow && data.plan.sessionDays[d] === key) st.setSessionDay(d, null);
    }
    setMsg(null);
    st.setSessionDay(dow, key);
  };

  const swap = (id: string, name: string | null) => {
    if (name) {
      const chk = checkExerciseSafety(name);
      if (chk.blocked) {
        setErr(chk.reason ?? 'Not allowed.');
        return;
      }
    }
    st.swapExercise(id, name);
    setEditing(null);
    setCustom('');
    setErr(null);
  };

  return (
    <Screen>
      <SectionTitle>Session days</SectionTitle>
      <T v="caption" muted>Default: Friday squat day, Saturday bench day, Tuesday deadlift day. Rest days get easy cardio.</T>
      {msg ? <Banner tone="warning" text={msg} /> : null}
      {DAYS.map((d) => (
        <Card key={d}>
          <T v="bodyStrong">{DAY_NAMES[d]}</T>
          <Row wrap>
            <Chip label="Rest + cardio" selected={!data.plan.sessionDays[d]} onPress={() => assign(d, null)} />
            {LIFT_SESSIONS.map((k) => (
              <Chip key={k} label={SESSIONS[k].short} selected={data.plan.sessionDays[d] === k} onPress={() => assign(d, k)} />
            ))}
          </Row>
        </Card>
      ))}

      <SectionTitle>Permanent exercise swaps</SectionTitle>
      <T v="caption" muted>The swapped exercise keeps its own progression history. Joint-safety rules apply.</T>
      {ALL_EXERCISES.map((e) => {
        const cur = data.plan.exerciseSwaps[e.id];
        return (
          <Card key={e.id}>
            <T v="bodyStrong">{e.name}</T>
            {cur ? <T v="label">Now: {cur}</T> : null}
            {editing === e.id ? (
              <>
                <Row wrap>
                  {e.alt.map((a) => (
                    <Chip key={a} label={altDisplayName(a)} onPress={() => swap(e.id, altDisplayName(a))} />
                  ))}
                  {cur ? <Chip label="Back to original" onPress={() => swap(e.id, null)} /> : null}
                </Row>
                <Field label="Type my own" value={custom} onChange={(v) => { setCustom(v); setErr(null); }} keyboard="default" />
                {err ? <Banner tone="danger" text={`Blocked: ${err}`} /> : null}
                <Row>
                  <Button label="Use my own" small disabled={custom.trim().length < 3} onPress={() => swap(e.id, custom.trim())} flex />
                  <Button label="Cancel" small variant="ghost" onPress={() => setEditing(null)} flex />
                </Row>
              </>
            ) : (
              <Button label="Swap" icon="swap" small variant="secondary" onPress={() => { setEditing(e.id); setCustom(''); setErr(null); }} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
