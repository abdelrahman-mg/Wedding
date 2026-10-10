import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { todayISO } from '../engine/dates';
import type { StrengthTest } from '../engine/types';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Field, num, Row, Screen, T } from '../ui/kit';

const ITEMS: { key: keyof Omit<StrengthTest, 'date'>; label: string; unit: string }[] = [
  { key: 'pushups', label: 'Max clean incline push-ups', unit: 'reps' },
  { key: 'legPress10', label: 'Leg press: 10-rep weight', unit: 'kg' },
  { key: 'row10', label: 'Seated row: 10-rep weight', unit: 'kg' },
  { key: 'plankSecs', label: 'Plank hold', unit: 's' },
];

export default function StrengthTestScreen() {
  const { which } = useLocalSearchParams<{ which?: string }>();
  const kind = which === 'final' ? 'final' : 'baseline';
  const tests = useApp((s) => s.data.strengthTests);
  const save = useApp((s) => s.setStrengthTest);
  const existing = tests[kind];
  const [f, setF] = useState<Record<string, string>>(
    Object.fromEntries(ITEMS.map((i) => [i.key, existing?.[i.key] != null ? String(existing[i.key]) : ''])),
  );
  const base = tests.baseline;

  return (
    <Screen>
      <T v="title">{kind === 'final' ? 'Week 12 test' : 'Baseline test'}</T>
      <T muted>
        {kind === 'final'
          ? 'Do this on Friday or Saturday of week 12, after the deload sets. Clean reps only, stop at RIR 1.'
          : 'Optional. Warm up first. Clean reps only, stop at RIR 1. No grinding, no breath-holding.'}
      </T>
      <Banner tone="warning" text="Breathe out on the effort. Stop at any sharp pain or if the shoulder feels unstable." />
      <Card>
        {ITEMS.map((i) => (
          <Field key={i.key} label={i.label} value={f[i.key]} onChange={(v) => setF({ ...f, [i.key]: v })} suffix={i.unit} keyboard="decimal-pad" />
        ))}
      </Card>
      {kind === 'final' && base ? (
        <Card tone="success">
          <T v="heading">Change vs baseline ({base.date})</T>
          {ITEMS.map((i) => {
            const b = base[i.key];
            const cur = num(f[i.key]);
            const pct = b && cur != null ? Math.round(((cur - b) / b) * 100) : null;
            return (
              <Row key={i.key} style={{ justifyContent: 'space-between' }}>
                <T style={{ flex: 1 }}>{i.label}</T>
                <T v="bodyStrong">{pct == null ? '–' : `${pct > 0 ? '+' : ''}${pct}%`}</T>
              </Row>
            );
          })}
          <T v="caption" muted>Goal: 30-60% stronger on the main lifts.</T>
        </Card>
      ) : null}
      {kind === 'final' && !base ? <T muted>No baseline was logged, so there is no percent change. Keep these numbers as the baseline for Block 2.</T> : null}
      <Button
        label="Save"
        icon="check"
        onPress={() => {
          save(kind, {
            date: todayISO(),
            pushups: num(f.pushups),
            legPress10: num(f.legPress10),
            row10: num(f.row10),
            plankSecs: num(f.plankSecs),
          });
          router.back();
        }}
      />
    </Screen>
  );
}
