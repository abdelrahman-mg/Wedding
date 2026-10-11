// Every workout and exercise in the plan, with targets for this week and the last logged numbers.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DAY_NAMES, DAYS } from '../data/plan';
import { altDisplayName, SESSIONS, type ExerciseDef, type SessionKey } from '../data/sessions';
import { targetRir, workingSets } from '../engine/phase';
import { historyFor, suggestProgression } from '../engine/progression';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Button, Card, Row, T } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';

function ExerciseItem({ def, week, deload }: { def: ExerciseDef; week: number; deload: boolean }) {
  const { c } = useTheme();
  const workouts = useApp((s) => s.data.workouts);
  const swap = useApp((s) => s.data.plan.exerciseSwaps[def.id]);
  const [open, setOpen] = useState(false);
  const name = swap ?? def.name;
  const sets = workingSets(def.sets, week, deload);
  const range = def.timed ? `${def.secs![0]}-${def.secs![1]} s` : def.reps![0] === def.reps![1] ? `${def.reps![0]}` : `${def.reps![0]}-${def.reps![1]}`;
  const sug = open ? suggestProgression(def, historyFor(workouts, name)) : null;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`${name}, ${sets} sets of ${range}. ${open ? 'Hide' : 'Show'} details`} style={{ paddingVertical: 10 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{name}</T>
            <T v="caption" muted>
              {sets} x {range}
              {def.perSide ? ' per side' : ''} · rest {def.rest}s · RIR {targetRir(def.rir, week, deload)} · {def.muscles}
            </T>
          </View>
          <Icon name={open ? 'up' : 'down'} color={c.textMuted} size={18} />
        </Row>
      </Pressable>
      {open && sug ? (
        <View style={{ paddingBottom: space.md, gap: 6 }}>
          <T>{def.cue}</T>
          {sug.lastSummary ? <T v="caption" muted>Last time: {sug.lastSummary}</T> : null}
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.sm, padding: space.sm }}>
            <T v="label" color={c.primary}>Next: {sug.message}</T>
          </View>
          <T v="caption" muted>Alternatives: {def.alt.map(altDisplayName).join(' · ')}</T>
          {swap ? <T v="caption" muted>Swapped from: {def.name}</T> : null}
        </View>
      ) : null}
    </View>
  );
}

export function SessionLibrary({ week, deload, todaySession, onStart }: { week: number; deload: boolean; todaySession: SessionKey | null; onStart: (k: SessionKey) => void }) {
  const { c } = useTheme();
  const sessionDays = useApp((s) => s.data.plan.sessionDays);
  const [open, setOpen] = useState<SessionKey | null>(null);
  const keys: SessionKey[] = ['UPPER_A', 'LOWER_A', 'UPPER_B', 'LOWER_B', 'MINIMUM'];
  return (
    <>
      {keys.map((k) => {
        const s = SESSIONS[k];
        const days = DAYS.filter((d) => sessionDays[d] === k).map((d) => DAY_NAMES[d]);
        const isOpen = open === k;
        return (
          <Card key={k} style={{ gap: 0 }}>
            <Pressable onPress={() => setOpen(isOpen ? null : k)} accessibilityRole="button" accessibilityLabel={`${s.name}. ${isOpen ? 'Hide' : 'Show'} exercises`}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T v="heading">{s.name}</T>
                  <T v="caption" muted>
                    {k === 'MINIMUM' ? 'For tired days · counts as a workout' : days.length ? days.join(', ') : 'Not scheduled'} · about {s.minutes} min · {s.exercises.length} exercises
                    {todaySession === k ? ' · TODAY' : ''}
                  </T>
                </View>
                <Icon name={isOpen ? 'up' : 'down'} color={c.textMuted} />
              </Row>
            </Pressable>
            {isOpen ? (
              <View style={{ marginTop: space.sm }}>
                {s.exercises.map((e) => (
                  <ExerciseItem key={e.id} def={e} week={week} deload={deload} />
                ))}
                <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm }}>
                  <Button label={`Start ${s.name} now`} icon="bolt" small onPress={() => onStart(k)} />
                </View>
              </View>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}
