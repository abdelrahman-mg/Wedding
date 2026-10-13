// Portion-based food tracking (no food scale): palms, fists, cupped hands, thumbs, spoons and pieces.
// Also the protein target tracker and the busy-day (minimum effort) card.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FOODS, GROUPS, getFood, PROTEIN_QUICK, type FoodGroup } from '../data/foods';
import { getMeal, SLOT_INFO } from '../data/meals';
import { proteinFix } from '../engine/nutrition';
import { daySummary } from '../engine/selectors';
import type { ExtraFood, ISODate } from '../engine/types';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Banner, Button, Card, Chip, ProgressBar, Row, Sheet, T } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';

/** Portions logged today by food group. */
export function portionTally(extras: ExtraFood[] | undefined): Record<FoodGroup, number> {
  const out: Record<FoodGroup, number> = { protein: 0, carb: 0, veg: 0, fat: 0, shake: 0 };
  for (const x of extras ?? []) {
    const f = x.foodId ? getFood(x.foodId) : undefined;
    if (f) out[f.group] += x.qty ?? 1;
  }
  return out;
}

function qtyOf(extras: ExtraFood[] | undefined, foodId: string): number {
  return extras?.find((x) => x.foodId === foodId)?.qty ?? 0;
}

function PortionRow({ foodId, date }: { foodId: string; date: ISODate }) {
  const { c } = useTheme();
  const food = getFood(foodId);
  const qty = useApp((s) => qtyOf(s.data.dayLogs[date]?.extras, foodId));
  const add = useApp((s) => s.addPortion);
  if (!food) return null;
  const btn = (delta: 1 | -1) => (
    <Pressable
      onPress={() => {
        if (delta < 0 && qty === 0) return;
        add(date, foodId, delta);
        if (delta > 0) Haptics.selectionAsync().catch(() => {});
      }}
      accessibilityRole="button"
      accessibilityLabel={`${delta > 0 ? 'Add' : 'Remove'} one portion of ${food.name}`}
      style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: delta > 0 ? c.primary : c.surfaceAlt, opacity: delta < 0 && qty === 0 ? 0.35 : 1 }}
    >
      <Icon name={delta > 0 ? 'plus' : 'minus'} color={delta > 0 ? c.onPrimary : c.primary} size={26} strokeWidth={2.5} />
    </Pressable>
  );
  return (
    <Row style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border }}>
      <View style={{ flex: 1 }}>
        <T v="bodyStrong">{food.name}</T>
        <T v="caption" muted>
          {food.portion} · {food.kcal} kcal{food.protein ? ` · ${food.protein} g protein` : ''}
        </T>
      </View>
      {btn(-1)}
      <T v="heading" style={{ minWidth: 28, textAlign: 'center' }}>{qty}</T>
      {btn(1)}
    </Row>
  );
}

export function PortionSheet({ visible, onClose, date }: { visible: boolean; onClose: () => void; date: ISODate }) {
  const [group, setGroup] = useState<FoodGroup>('protein');
  const g = GROUPS.find((x) => x.id === group)!;
  const extras = useApp((s) => s.data.dayLogs[date]?.extras);
  const tally = portionTally(extras);
  return (
    <Sheet visible={visible} onClose={onClose} title="Add food by portion">
      <T muted>No scale needed. Tap + for each portion you ate. Your hand is the measuring tool.</T>
      <Row wrap>
        {GROUPS.map((x) => (
          <Chip key={x.id} label={`${x.label}${tally[x.id] ? ` · ${tally[x.id]}` : ''}`} selected={group === x.id} onPress={() => setGroup(x.id)} />
        ))}
      </Row>
      <Banner tone="info" icon="food" text={g.guide} />
      <View>
        {FOODS.filter((f) => f.group === group).map((f) => (
          <PortionRow key={f.id} foodId={f.id} date={date} />
        ))}
      </View>
      <Button label="Done" icon="check" onPress={onClose} />
    </Sheet>
  );
}

export function PortionSummary({ date }: { date: ISODate }) {
  const extras = useApp((s) => s.data.dayLogs[date]?.extras);
  const tally = portionTally(extras);
  const parts = GROUPS.filter((g) => tally[g.id] > 0).map((g) => `${tally[g.id]} ${g.id === 'shake' ? (tally[g.id] === 1 ? 'shake/drink' : 'shakes/drinks') : g.label.toLowerCase()}`);
  if (!parts.length) return null;
  return <T v="caption" muted>Logged by portion today: {parts.join(' · ')}</T>;
}

/** Big one-tap protein buttons plus the day's protein target. */
export function ProteinTracker({ date, compact }: { date: ISODate; compact?: boolean }) {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const add = useApp((s) => s.addPortion);
  const sum = useMemo(() => daySummary(data, date), [data, date]);
  const target = sum.ctx.proteinTarget;
  const gap = target - sum.protein;
  const extras = data.dayLogs[date]?.extras;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="heading">Protein today</T>
        <T v="number" color={gap <= 0 ? c.success : c.text}>
          {Math.round(sum.protein)}
          <T v="label" muted> / {target} g</T>
        </T>
      </Row>
      <ProgressBar value={sum.protein} max={target} color={gap <= 0 ? c.emerald : undefined} />
      <T v="label" muted>{gap <= 0 ? 'Protein target reached. Nice.' : proteinFix(gap)}</T>
      {!compact ? <T v="caption" muted>Tap what you just had. Each tap adds one portion.</T> : null}
      <Row wrap style={{ justifyContent: 'space-between' }}>
        {PROTEIN_QUICK.map((id) => {
          const f = getFood(id);
          if (!f) return null;
          const q = qtyOf(extras, id);
          return (
            <Pressable
              key={id}
              onPress={() => {
                add(date, id, 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              onLongPress={() => q > 0 && add(date, id, -1)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${f.portion} of ${f.name}, ${f.protein} grams protein. ${q} added.`}
              accessibilityHint="Long press to remove one"
              style={{ width: '48.5%', minHeight: 72, borderRadius: radius.md, backgroundColor: q ? c.successSoft : c.surfaceAlt, padding: space.md, justifyContent: 'center', gap: 2 }}
            >
              <T v="bodyStrong" color={q ? c.success : c.primary}>+ {f.name.replace(' (in water)', '').replace(' (no skin)', '')}</T>
              <T v="caption" muted>
                {f.portion} · {f.protein} g{q ? ` · added ${q}` : ''}
              </T>
            </Pressable>
          );
        })}
      </Row>
      {(extras ?? []).some((x) => x.foodId && PROTEIN_QUICK.includes(x.foodId)) ? <T v="caption" muted>Added by mistake? Long press the button to remove one.</T> : null}
    </Card>
  );
}

/** Busy day / minimum effort: three simple meals plus the protein target, nothing else. */
export function BusyCard({ date }: { date: ISODate }) {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const sum = useMemo(() => daySummary(data, date), [data, date]);
  const log = data.dayLogs[date];
  return (
    <>
      <Banner tone="accent" icon="bolt" text="Busy day mode: three simple meals and your protein. That is the whole job today." />
      <Card style={{ paddingVertical: 0, gap: 0 }}>
        {sum.ctx.slots.map((s, i) => {
          const m = getMeal(s.mealId);
          if (!m) return null;
          const done = !!log?.meals[s.slot] && log.meals[s.slot]?.status !== 'skipped';
          return (
            <Pressable
              key={s.slot}
              onPress={() => {
                if (done) st.setMeal(date, s.slot, null);
                else {
                  st.setMeal(date, s.slot, { status: 'eaten', mealId: s.mealId });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                }
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${SLOT_INFO[s.slot].label}: ${m.name}. ${done ? 'Eaten' : 'Tap when eaten'}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, minHeight: 84 }}
            >
              <View style={{ flex: 1 }}>
                <T v="caption" muted>{SLOT_INFO[s.slot].label}</T>
                <T v="heading">{m.name}</T>
                <T v="caption" muted>{m.desc}</T>
                <T v="caption" muted>{m.kcal} kcal · {m.protein} g protein</T>
              </View>
              <View style={{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: done ? c.emerald : c.border, backgroundColor: done ? c.emerald : 'transparent' }}>
                <Icon name="check" color={done ? '#fff' : c.textMuted} size={30} strokeWidth={2.5} />
              </View>
            </Pressable>
          );
        })}
      </Card>
      <ProteinTracker date={date} compact />
      <Button label="Back to the full plan" variant="ghost" onPress={() => st.setBusy(date, false)} />
    </>
  );
}
