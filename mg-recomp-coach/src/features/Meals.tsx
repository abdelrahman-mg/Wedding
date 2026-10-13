// Meal checklist for a day (planned slots + extra food), with Plan B and Skip.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { getMeal, SLOT_INFO, type Slot } from '../data/meals';
import { weekDates, weekStart } from '../engine/dates';
import { plannedTotals, proteinFix, type PlannedSlot } from '../engine/nutrition';
import { daySummary } from '../engine/selectors';
import type { ISODate, MealLog } from '../engine/types';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Banner, Button, Card, Field, IconButton, num, Row, Sheet, T, ToggleRow } from '../ui/kit';
import { space, useTheme } from '../ui/theme';
import { PlanBSheet } from './PlanBSheet';
import { PortionSheet, PortionSummary } from './Portions';

function MealRow({
  s,
  entry,
  expanded,
  onToggle,
  onEat,
  onPlanB,
  onSkip,
}: {
  s: PlannedSlot;
  entry: MealLog | undefined;
  expanded: boolean;
  onToggle: () => void;
  onEat: () => void;
  onPlanB: () => void;
  onSkip: () => void;
}) {
  const { c } = useTheme();
  const planned = getMeal(s.mealId);
  if (!planned) return null;
  const replacement = entry?.status === 'planB' && entry.mealId ? getMeal(entry.mealId) : undefined;
  const custom = entry?.status === 'custom' ? entry.custom : undefined;
  const shown = replacement ?? planned;
  const done = !!entry && entry.status !== 'skipped';
  const skipped = entry?.status === 'skipped';
  const name = custom?.name ?? shown.name;
  const kcal = custom?.kcal ?? shown.kcal;
  const protein = custom?.protein ?? shown.protein;
  const tag = entry?.status === 'planB' ? 'Plan B' : custom ? 'Custom' : skipped ? 'Skipped' : null;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
      <Row style={{ paddingVertical: 10 }}>
        <Pressable onPress={onToggle} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${SLOT_INFO[s.slot].label}: ${name}. ${expanded ? 'Hide' : 'Show'} details`}>
          <T v="caption" muted>
            {SLOT_INFO[s.slot].time} · {SLOT_INFO[s.slot].label}
            {tag ? ` · ${tag}` : ''}
          </T>
          <T v="bodyStrong" style={{ textDecorationLine: skipped ? 'line-through' : 'none', color: skipped ? c.textMuted : c.text }}>
            {name}
          </T>
          <T v="caption" muted>
            {kcal} kcal · {protein} g protein
          </T>
        </Pressable>
        <Pressable
          onPress={onEat}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Ate it: ${name}`}
          hitSlop={6}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: done ? c.emerald : c.border,
            backgroundColor: done ? c.emerald : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check" color={done ? '#fff' : c.textMuted} size={24} strokeWidth={2.5} />
        </Pressable>
      </Row>
      {expanded ? (
        <View style={{ paddingBottom: space.md, gap: space.sm }}>
          {!custom ? <T muted>{shown.desc}</T> : null}
          <Row>
            <Button label="Plan B" icon="swap" small variant="secondary" onPress={onPlanB} flex />
            <Button label="Skip" small variant="ghost" onPress={onSkip} flex />
          </Row>
        </View>
      ) : null}
    </View>
  );
}

/** Estimates for common extras. Rough numbers, labeled as estimates in the UI. */
export const QUICK_FOODS: { name: string; kcal: number; protein: number; treat?: boolean }[] = [
  { name: 'Small apple', kcal: 80, protein: 0 },
  { name: 'Banana', kcal: 105, protein: 1 },
  { name: 'Greek yogurt cup', kcal: 110, protein: 16 },
  { name: 'Boiled egg', kcal: 70, protein: 6 },
  { name: 'Whey scoop in water', kcal: 120, protein: 24 },
  { name: 'Cheese triangle', kcal: 40, protein: 3 },
  { name: 'Handful of nuts', kcal: 180, protein: 6 },
  { name: '3 dates', kcal: 200, protein: 2 },
  { name: 'Coffee with milk', kcal: 40, protein: 2 },
  { name: 'Tea with 1 tsp sugar', kcal: 20, protein: 0 },
  { name: 'Half baladi loaf', kcal: 150, protein: 5 },
  { name: 'Piece of dessert (kunafa, basbousa)', kcal: 350, protein: 5, treat: true },
];

export function AddFoodSheet({ visible, onClose, date }: { visible: boolean; onClose: () => void; date: ISODate }) {
  const submit = useApp((s) => s.submit);
  const [f, setF] = useState({ name: '', kcal: '', protein: '', treat: false });
  const close = () => {
    setF({ name: '', kcal: '', protein: '', treat: false });
    onClose();
  };
  const add = (food: { name: string; kcal: number; protein: number; treat?: boolean }) => {
    submit(date, 'food', food.kcal, { food: { name: food.name, kcal: food.kcal, protein: food.protein, treat: food.treat } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    close();
  };
  const kcal = num(f.kcal);
  return (
    <Sheet visible={visible} onClose={close} title="Add food">
      <T muted>Anything you ate outside the planned meals. Rough is fine: honest beats perfect.</T>
      <T v="label">Quick add (estimates)</T>
      <Row wrap>
        {QUICK_FOODS.map((q) => (
          <Button key={q.name} label={`${q.name} · ${q.kcal}`} small variant="secondary" onPress={() => add(q)} />
        ))}
      </Row>
      <T v="label">Or type it</T>
      <Field label="What was it?" value={f.name} onChange={(v) => setF({ ...f, name: v })} keyboard="default" placeholder="e.g. Shawarma sandwich" />
      <Row>
        <Field label="kcal (estimate)" value={f.kcal} onChange={(v) => setF({ ...f, kcal: v })} keyboard="number-pad" />
        <Field label="Protein" value={f.protein} onChange={(v) => setF({ ...f, protein: v })} keyboard="number-pad" suffix="g" />
      </Row>
      <ToggleRow label="This was a treat" value={f.treat} onChange={(v) => setF({ ...f, treat: v })} />
      <Button
        label="Submit"
        icon="check"
        disabled={!f.name.trim() || kcal == null}
        onPress={() => add({ name: f.name.trim(), kcal: Math.round(kcal ?? 0), protein: Math.round(num(f.protein) ?? 0), treat: f.treat })}
      />
    </Sheet>
  );
}

export function MealsCard({ date, isToday }: { date: ISODate; isToday: boolean }) {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const sum = useMemo(() => daySummary(data, date), [data, date]);
  const { ctx } = sum;
  const log = data.dayLogs[date];
  const [open, setOpen] = useState<Slot | null>(null);
  const [planB, setPlanB] = useState<{ slot: Slot; mealId: string } | null>(null);
  const [skipMsg, setSkipMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [portions, setPortions] = useState(false);
  const plannedKcal = plannedTotals(data.plan, ctx.dow, ctx.isGym).kcal;
  const nextSlot = ctx.slots.find((s) => !log?.meals[s.slot]);
  const expanded = open ?? (isToday ? nextSlot?.slot ?? null : null);

  const treatsThisWeek = useMemo(() => {
    let n = 0;
    for (const d of weekDates(weekStart(date))) {
      const l = data.dayLogs[d];
      if (!l) continue;
      for (const m of Object.values(l.meals)) {
        if (!m) continue;
        if ((m.status === 'eaten' || m.status === 'planB') && m.mealId === 'T') n++;
        if (m.status === 'custom' && m.custom?.treat) n++;
      }
      n += (l.extras ?? []).filter((x) => x.treat).length;
    }
    return n;
  }, [data.dayLogs, date]);

  const eat = (slot: Slot, mealId: string) => {
    const cur = log?.meals[slot];
    if (cur && cur.status !== 'skipped') {
      st.setMeal(date, slot, null);
      return;
    }
    st.setMeal(date, slot, { status: 'eaten', mealId });
    if (open === slot) setOpen(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const skip = (slot: Slot, mealId: string) => {
    const cur = log?.meals[slot];
    const curProtein =
      cur?.status === 'custom' ? cur.custom?.protein ?? 0 : cur && cur.status !== 'skipped' ? getMeal(cur.mealId ?? mealId)?.protein ?? 0 : 0;
    st.setMeal(date, slot, { status: 'skipped' });
    const m = getMeal(mealId);
    const stillPlanned = ctx.slots.filter((s) => s.slot !== slot && !log?.meals[s.slot]).reduce((a, s) => a + (getMeal(s.mealId)?.protein ?? 0), 0);
    const short = ctx.proteinTarget - (sum.protein - curProtein + stillPlanned);
    setSkipMsg(`${m?.name ?? 'Meal'} skipped. ${short > 0 ? proteinFix(short) : 'Protein is still covered by your remaining meals.'}`);
    setOpen(null);
  };

  const extras = log?.extras ?? [];

  return (
    <>
      {skipMsg ? <Banner tone="info" text={skipMsg} onPress={() => setSkipMsg(null)} action="Dismiss" /> : null}
      <Card style={{ paddingVertical: 0, gap: 0 }}>
        {ctx.slots.map((s, i) => (
          <View key={s.slot} style={i === 0 ? { marginTop: -1 } : undefined}>
            <MealRow
              s={s}
              entry={log?.meals[s.slot]}
              expanded={expanded === s.slot}
              onToggle={() => setOpen(expanded === s.slot ? null : s.slot)}
              onEat={() => eat(s.slot, s.mealId)}
              onPlanB={() => setPlanB({ slot: s.slot, mealId: s.mealId })}
              onSkip={() => skip(s.slot, s.mealId)}
            />
          </View>
        ))}
        {extras.map((x) => (
          <Row key={x.id} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <T v="caption" muted>
                {new Date(x.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Extra{x.treat ? ' · Treat' : ''}
              </T>
              <T v="bodyStrong">{x.name}</T>
              <T v="caption" muted>
                {x.kcal} kcal · {x.protein} g protein
              </T>
            </View>
            <IconButton name="close" label={`Remove ${x.name}`} onPress={() => st.removeExtra(date, x.id)} color={c.textMuted} />
          </Row>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: space.sm }}>
          <Row>
            <Button label="Add by portion" icon="food" small variant="secondary" onPress={() => setPortions(true)} flex />
            <Button label="Type it" icon="plus" small variant="ghost" onPress={() => setAdding(true)} flex />
          </Row>
        </View>
      </Card>
      <PortionSummary date={date} />
      <T v="caption" muted>Tap a meal for details, Plan B or skip. Tap the circle when you’ve eaten it.</T>

      {planB ? (
        <PlanBSheet
          visible
          onClose={() => setPlanB(null)}
          date={date}
          slot={planB.slot}
          plannedId={planB.mealId}
          dayPlannedKcal={plannedKcal}
          dayTarget={ctx.kcalTarget}
          treatsThisWeek={treatsThisWeek}
        />
      ) : null}
      <AddFoodSheet visible={adding} onClose={() => setAdding(false)} date={date} />
      <PortionSheet visible={portions} onClose={() => setPortions(false)} date={date} />
    </>
  );
}
