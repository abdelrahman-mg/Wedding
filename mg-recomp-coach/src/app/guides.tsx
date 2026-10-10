import { useState } from 'react';
import { View } from 'react-native';
import { EATING_OUT_RULES, INGREDIENT_PLAN_B, SUPPLEMENTS } from '../data/guides';
import { emergencyMeals } from '../data/meals';
import { useApp } from '../store/useApp';
import { Card, Chip, Row, Screen, T } from '../ui/kit';
import { space, useTheme } from '../ui/theme';

type Tab = 'planb' | 'out' | 'supp';

export default function Guides() {
  const { c } = useTheme();
  const kidney = useApp((s) => !!s.data.checklist.kidney_normal?.done);
  const [tab, setTab] = useState<Tab>('planb');
  return (
    <Screen>
      <Row wrap>
        <Chip label="Ingredient Plan B" selected={tab === 'planb'} onPress={() => setTab('planb')} />
        <Chip label="Eating out" selected={tab === 'out'} onPress={() => setTab('out')} />
        <Chip label="Supplements" selected={tab === 'supp'} onPress={() => setTab('supp')} />
      </Row>

      {tab === 'planb' ? (
        <>
          <T v="heading">Not available? Use this</T>
          <Card style={{ gap: 0 }}>
            {INGREDIENT_PLAN_B.map((r) => (
              <View key={r.missing} style={{ paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <T v="bodyStrong">{r.missing}</T>
                <T muted>{r.use}</T>
              </View>
            ))}
          </Card>
          <T v="heading">Emergency meals (no cooking)</T>
          {emergencyMeals().map((m) => (
            <Card key={m.id}>
              <T v="bodyStrong">
                {m.id} · {m.name}
              </T>
              <T muted>{m.desc}</T>
              <T v="label">
                {m.kcal} kcal · {m.protein} g protein
              </T>
            </Card>
          ))}
        </>
      ) : null}

      {tab === 'out'
        ? EATING_OUT_RULES.map((r) => (
            <Card key={r} tone="alt">
              <T>{r}</T>
            </Card>
          ))
        : null}

      {tab === 'supp'
        ? SUPPLEMENTS.map((s) => {
            const locked = s.verdict === 'locked' && !kidney;
            return (
              <Card key={s.id} tone={s.verdict === 'avoid' ? 'danger' : locked ? 'alt' : 'default'}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="bodyStrong" style={{ flex: 1 }}>{s.name}</T>
                  <T v="label" color={s.verdict === 'avoid' ? c.danger : c.primary}>
                    {s.verdict === 'locked' ? (locked ? 'LOCKED' : 'UNLOCKED') : s.verdict.toUpperCase()}
                  </T>
                </Row>
                <T muted={locked}>{locked ? 'Unlocks after you tick “Kidney labs done and normal” in Health checks.' : s.text}</T>
              </Card>
            );
          })
        : null}
    </Screen>
  );
}
