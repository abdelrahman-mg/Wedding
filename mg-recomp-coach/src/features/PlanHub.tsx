import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { PHASES, WEEK_TARGETS } from '../data/phases';
import { todayISO, weekStart } from '../engine/dates';
import { planAverageKcal } from '../engine/nutrition';
import { weekFor } from '../engine/selectors';
import { weightBand } from '../engine/targets';
import { useApp } from '../store/useApp';
import { Icon, type IconName } from '../ui/Icon';
import { Card, Row, SectionTitle, T, ToggleRow } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';
import { useUnits } from '../ui/units';

function LinkRow({ icon, title, sub, href }: { icon: IconName; title: string; sub?: string; href: Href }) {
  const { c } = useTheme();
  return (
    <Card onPress={() => router.push(href)} accessibilityLabel={title} style={{ paddingVertical: space.md }}>
      <Row>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} color={c.primary} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="bodyStrong">{title}</T>
          {sub ? <T v="caption" muted>{sub}</T> : null}
        </View>
        <Icon name="right" color={c.textMuted} size={18} />
      </Row>
    </Card>
  );
}

/** Roadmap, holiday mode and links to every plan and settings screen. */
export function PlanHub() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const toggleHoliday = useApp((s) => s.toggleHoliday);
  const u = useUnits();
  const today = todayISO();
  const current = Math.min(12, weekFor(data, today));
  const avg = useMemo(() => planAverageKcal(data.plan), [data.plan]);
  const sunday = weekStart(today);
  const holiday = data.settings.holidayWeeks.includes(sunday);

  return (
    <>
      <T muted>
        Plan average about {avg.toLocaleString('en-US')} kcal/day · protein {data.adjust.proteinTarget} g · adjustments: steps {data.adjust.stepsAdjust >= 0 ? '+' : ''}
        {data.adjust.stepsAdjust}, kcal {data.adjust.kcalAdjust >= 0 ? '+' : ''}
        {data.adjust.kcalAdjust}, cardio {data.adjust.cardioAdjust >= 0 ? '+' : ''}
        {data.adjust.cardioAdjust} min
      </T>

      <SectionTitle>Edit the plan</SectionTitle>
      <LinkRow icon="plan" title="Weekly meal plan" sub="Pick meals per day, move the treat, reset" href="/edit-meals" />
      <LinkRow icon="train" title="Workouts" sub="Move sessions, permanent exercise swaps" href="/edit-workouts" />
      <LinkRow icon="bolt" title="Targets" sub="Protein, base kcal, steps and cardio adjustments" href="/targets" />

      <SectionTitle>Kitchen</SectionTitle>
      <LinkRow icon="cart" title="Shopping list" sub="Resets every week" href="/shopping" />
      <LinkRow icon="timer" title="Meal prep schedule" sub="Friday morning and Tuesday evening" href="/prep" />
      <LinkRow icon="swap" title="Guides" sub="Ingredient Plan B, eating out, supplements" href="/guides" />

      <SectionTitle>You</SectionTitle>
      <LinkRow icon="heart" title="Health checks" sub="Doctor, labs, blood pressure log" href="/health" />
      <LinkRow icon="moon" title="Reminders" sub="Times, toggles, snooze" href="/reminders" />
      <LinkRow icon="gear" title="Settings" sub="Theme, units, backup, demo mode, AI coach, about" href="/settings" />
      <LinkRow icon="alert" title="Safety and disclaimers" href="/safety" />
      <SectionTitle>12-week roadmap</SectionTitle>
      <Card style={{ gap: 0, padding: space.sm }}>
        {WEEK_TARGETS.map((w) => {
          const cur = w.week === current;
          const b = weightBand(w.week, data.profile.startWeight);
          const steps = Math.min(12000, w.steps + data.adjust.stepsAdjust);
          return (
            <View
              key={w.week}
              accessible
              accessibilityLabel={`Week ${w.week}${cur ? ', current week' : ''}. ${PHASES[w.phase].name}. ${steps} steps. Cardio ${w.cardio} minutes. Band ${b.low} to ${b.high}.`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: space.sm,
                paddingHorizontal: space.sm,
                borderRadius: radius.sm,
                backgroundColor: cur ? c.surfaceAlt : 'transparent',
                borderLeftWidth: 4,
                borderLeftColor: cur ? c.accent : w.lifting === 'deload' ? c.border : 'transparent',
                gap: space.sm,
              }}
            >
              <T v="bodyStrong" style={{ width: 34 }}>W{w.week}</T>
              <View style={{ flex: 1 }}>
                <T v="label">
                  {PHASES[w.phase].name}
                  {w.lifting === 'deload' ? ' · deload' : w.lifting === 'easeIn' ? ' · ease-in' : ''}
                  {cur ? ' · NOW' : ''}
                </T>
                <T v="caption" muted>
                  {steps.toLocaleString('en-US')} steps · cardio {w.cardio} min · band {u.w(b.low).toFixed(1)}–{u.w(b.high).toFixed(1)} {u.wUnit}
                </T>
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <ToggleRow
          label="Holiday / social week mode"
          sub="This week only: maintenance (+300 kcal), band check paused, restart messaging."
          value={holiday}
          onChange={() => toggleHoliday(sunday)}
        />
      </Card>

    </>
  );
}
