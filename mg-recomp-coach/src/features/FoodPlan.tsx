import { useState } from 'react';
import { emergencyMeals, getMeal, mealsForSlot, SLOT_INFO, type Slot } from '../data/meals';
import { DAY_SHORT, DAYS, type DayOfWeek } from '../data/plan';
import { dayOfWeek, todayISO } from '../engine/dates';
import { plannedSlots, plannedTotals } from '../engine/nutrition';
import { useApp } from '../store/useApp';
import { Card, Chip, Row, SectionTitle, T } from '../ui/kit';
import { space, useTheme } from '../ui/theme';

const LIB_SLOTS: (Slot | 'E')[] = ['B', 'M', 'L', 'D', 'N', 'E'];
const LIB_LABEL: Record<Slot | 'E', string> = { ...Object.fromEntries(Object.entries(SLOT_INFO).map(([k, v]) => [k, v.label])), E: 'No cooking' } as Record<Slot | 'E', string>;

/** Weekly meal plan, meal library and kitchen links. */
export function FoodPlan() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const today = todayISO();
  const [planDay, setPlanDay] = useState<DayOfWeek>(dayOfWeek(today));
  const [lib, setLib] = useState<Slot | 'E'>('B');

  const weekSlots = plannedSlots(data.plan, planDay);
  const weekTotals = plannedTotals(data.plan, planDay);
  const libMeals = lib === 'E' ? emergencyMeals() : mealsForSlot(lib);

  return (
    <>
      <SectionTitle>This week’s meals</SectionTitle>
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

    </>
  );
}
