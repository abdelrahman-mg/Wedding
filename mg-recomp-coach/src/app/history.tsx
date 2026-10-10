import { Alert } from 'react-native';
import { SESSIONS } from '../data/sessions';
import { formatLong } from '../engine/dates';
import { useApp } from '../store/useApp';
import { Button, Card, Empty, Row, Screen, T } from '../ui/kit';
import { useTheme } from '../ui/theme';

export default function History() {
  const { c } = useTheme();
  const workouts = useApp((s) => s.data.workouts);
  const del = useApp((s) => s.deleteWorkout);
  const list = [...workouts].sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1));
  if (!list.length) return <Screen><Empty title="No workouts yet" text="Your sessions show up here after you finish one in Train." /></Screen>;
  return (
    <Screen>
      {list.map((w) => {
        const byEx: Record<string, typeof w.sets> = {};
        for (const s of w.sets) (byEx[s.nameUsed] ??= []).push(s);
        const vol = w.sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);
        return (
          <Card key={w.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="heading">{w.kind === 'walk' ? 'Walk fallback' : SESSIONS[w.sessionKey].name}</T>
              <T v="caption" muted>{formatLong(w.date)}</T>
            </Row>
            <T v="caption" muted>
              {w.kind} · {w.durationMin} min · {w.sets.length} sets · volume {Math.round(vol).toLocaleString('en-US')}
              {w.deload ? ' · deload' : ''}
              {w.feel ? ` · felt ${w.feel}/5` : ''}
            </T>
            {w.prs?.length ? <T v="label" color={c.accent}>PR: {w.prs.join(', ')}</T> : null}
            {Object.entries(byEx).map(([name, sets]) => (
              <T key={name}>
                <T v="bodyStrong">{name}: </T>
                {sets
                  .sort((a, b) => a.setIndex - b.setIndex)
                  .map((s) => `${s.weight ? `${s.weight}x` : ''}${s.reps ?? '-'}${s.rir != null ? ` @${s.rir === 4 ? '4+' : s.rir}` : ''}`)
                  .join(', ')}
              </T>
            ))}
            <Button
              label="Delete"
              small
              variant="ghost"
              onPress={() =>
                Alert.alert('Delete this workout?', 'Progression suggestions will no longer use it.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => del(w.id) },
                ])
              }
            />
          </Card>
        );
      })}
    </Screen>
  );
}
