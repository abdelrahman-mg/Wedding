import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { emergencyMeals, getMeal, mealsForSlot, SLOT_INFO, type Slot } from '../../data/meals';
import { DAY_SHORT, DAYS, type DayOfWeek } from '../../data/plan';
import { addDays, dayOfWeek, formatLong, formatShort, todayISO } from '../../engine/dates';
import { plannedSlots, plannedTotals } from '../../engine/nutrition';
import { daySummary } from '../../engine/selectors';
import { MealsCard } from '../../features/Meals';
import { useApp } from '../../store/useApp';
import { Icon, type IconName } from '../../ui/Icon';
import { Card, Chip, IconButton, ProgressBar, Row, Screen, ScreenHeader, SectionTitle, T } from '../../ui/kit';
import { radius, space, useTheme } from '../../ui/theme';

function Link({ icon, title, sub, href }: { icon: IconName; title: string; sub: string; href: Href }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: space.md, gap: 4, opacity: pressed ? 0.8 : 1 })}
    >
      <Icon name={icon} color={c.primary} />
      <T v="bodyStrong">{title}</T>
      <T v="caption" muted>{sub}</T>
    </Pressable>
  );
}

const LIB_SLOTS: (Slot | 'E')[] = ['B', 'M', 'L', 'D', 'N', 'E'];
const LIB_LABEL: Record<Slot | 'E', string> = { ...Object.fromEntries(Object.entries(SLOT_INFO).map(([k, v]) => [k, v.label])), E: 'No cooking' } as Record<Slot | 'E', string>;

export default function Food() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [planDay, setPlanDay] = useState<DayOfWeek>(dayOfWeek(today));
  const [lib, setLib] = useState<Slot | 'E'>('B');
  const sum = useMemo(() => daySummary(data, date), [data, date]);
  const { ctx } = sum;

  const weekSlots = plannedSlots(data.plan, planDay);
  const weekTotals = plannedTotals(data.plan, planDay);
  const libMeals = lib === 'E' ? emergencyMeals() : mealsForSlot(lib);

  return (
    <Screen>
      <ScreenHeader title="Food" subtitle={`${ctx.kcalTarget.toLocaleString('en-US')} kcal · ${ctx.proteinTarget} g protein today`} />

      <Row style={{ justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border }}>
        <IconButton name="left" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
        <Pressable onPress={() => setDate(today)} accessibilityRole="button" accessibilityLabel="Back to today">
          <T v="bodyStrong">{date === today ? `Today, ${formatShort(date)}` : formatLong(date)}</T>
        </Pressable>
        <IconButton name="right" label="Next day" onPress={() => date < today && setDate(addDays(date, 1))} color={date < today ? c.text : c.border} />
      </Row>

      <Card>
        <ProgressBar label="Calories" value={sum.kcal} max={ctx.kcalTarget} valueText={`${sum.kcal} / ${ctx.kcalTarget}`} color={sum.kcal > ctx.kcalTarget + 150 ? c.warning : undefined} />
        <ProgressBar label="Protein" value={sum.protein} max={ctx.proteinTarget} valueText={`${sum.protein} / ${ctx.proteinTarget} g`} />
      </Card>

      <SectionTitle>{date === today ? 'Today’s meals' : 'Meals'}</SectionTitle>
      <MealsCard key={date} date={date} isToday={date === today} />

      <SectionTitle>Weekly plan</SectionTitle>
      <Row wrap gap={6}>
        {DAYS.map((d) => (
          <Chip key={d} label={DAY_SHORT[d]} selected={planDay === d} onPress={() => setPlanDay(d)} />
        ))}
      </Row>
      <Card style={{ gap: 0 }}>
        <Row style={{ justifyContent: 'space-between', paddingBottom: space.sm }}>
          <T v="bodyStrong">{data.plan.sessionDays[planDay] ? 'Gym day' : 'Rest + cardio day'}</T>
          <T v="caption" muted>
            {weekTotals.kcal.toLocaleString('en-US')} kcal · {weekTotals.protein} g
          </T>
        </Row>
        {weekSlots.map((s) => {
          const m = getMeal(s.mealId);
          return (
            <Row key={s.slot} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.border }}>
              <T v="caption" muted style={{ width: 82 }}>{SLOT_INFO[s.slot].label}</T>
              <T style={{ flex: 1 }}>{m?.name}</T>
              <T v="caption" muted>{m?.kcal}</T>
            </Row>
          );
        })}
      </Card>

      <SectionTitle>Meal library</SectionTitle>
      <Row wrap gap={6}>
        {LIB_SLOTS.map((s) => (
          <Chip key={s} label={LIB_LABEL[s]} selected={lib === s} onPress={() => setLib(s)} />
        ))}
      </Row>
      {libMeals.map((m) => (
        <Card key={m.id} style={{ paddingVertical: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="bodyStrong" style={{ flex: 1 }}>
              {m.id} · {m.name}
            </T>
            <T v="label" muted>
              {m.kcal} kcal · {m.protein} g
            </T>
          </Row>
          <T v="caption" muted>{m.desc}</T>
        </Card>
      ))}
      <T v="caption" muted>To use a meal permanently, edit the weekly plan. For one day, use Plan B on that meal.</T>

      <SectionTitle>Kitchen</SectionTitle>
      <Row wrap gap={space.sm}>
        <Link icon="cart" title="Shopping list" sub="Resets every week" href="/shopping" />
        <Link icon="timer" title="Meal prep" sub="Fri morning, Tue evening" href="/prep" />
        <Link icon="swap" title="Swaps and eating out" sub="Ingredient Plan B, delivery rules" href="/guides" />
        <Link icon="plan" title="Edit weekly plan" sub="Change meals, move the treat" href="/edit-meals" />
      </Row>
    </Screen>
  );
}
