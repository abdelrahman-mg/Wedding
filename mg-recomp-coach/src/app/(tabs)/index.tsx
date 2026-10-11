import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { getMeal, SLOT_INFO, type Slot } from '../../data/meals';
import { ARABIC_PHRASES, DAILY_MESSAGES } from '../../data/messages';
import { addDays, formatLong, formatShort, programWeek, todayISO, weekDates, weekStart } from '../../engine/dates';
import { kcalRemovalSuggestions, plannedTotals } from '../../engine/nutrition';
import { daySummary, pickMessageIndex, streaksAndXp, weekStats } from '../../engine/selectors';
import { useCoachProposals } from '../../features/CoachPanel';
import { PlanBSheet } from '../../features/PlanBSheet';
import { useApp } from '../../store/useApp';
import { Icon } from '../../ui/Icon';
import { AlertStack, Button, Card, IconButton, ProgressBar, Ring, Row, Screen, ScreenHeader, SectionTitle, T, type AlertItem } from '../../ui/kit';
import { radius, space, useTheme } from '../../ui/theme';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [planB, setPlanB] = useState<{ slot: Slot; mealId: string } | null>(null);
  const coach = useCoachProposals();

  const start = data.profile.startDate ?? today;
  const sum = useMemo(() => daySummary(data, date), [data, date]);
  const { ctx } = sum;
  const log = data.dayLogs[date];
  const streak = useMemo(() => streaksAndXp(data, today), [data, today]);
  const plannedKcal = plannedTotals(data.plan, ctx.dow, ctx.isGym).kcal;
  const wk = useMemo(() => weekStats(data, weekStart(date)), [data, date]);
  const isToday = date === today;
  const week = programWeek(start, date);

  // Daily message, never repeated within 14 days.
  const msgIdx = pickMessageIndex(data.messageHistory, today);
  useEffect(() => {
    if (data.messageHistory[today] == null) st.setMessageIndex(today, msgIdx);
  }, [today, msgIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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
    }
    return n;
  }, [data.dayLogs, date]);

  const yesterday = addDays(today, -1);
  const showMorning = isToday && new Date().getHours() < 11 && !log?.morningSeen && yesterday >= start;
  const ySum = useMemo(() => (yesterday >= start ? daySummary(data, yesterday) : null), [data, yesterday, start]);
  const missedYesterday = isToday && !!ySum && ySum.score.total < 70;
  const nextSlot = ctx.slots.find((s) => !log?.meals[s.slot]);
  const nextMeal = nextSlot ? getMeal(nextSlot.mealId) : undefined;

  const alerts: AlertItem[] = [];
  if (data.settings.demoMode) alerts.push({ key: 'demo', tone: 'accent', icon: 'star', text: 'Demo mode: this is fake data. Turn it off in Settings.', onPress: () => router.push('/settings') });
  if (!data.checklist.doctor_bp?.done) alerts.push({ key: 'bp', tone: 'warning', text: 'BP not yet checked by a doctor: keep workouts moderate, no heavy straining or breath-holding.', onPress: () => router.push('/health') });
  if (week > 12) alerts.push({ key: 'block', tone: 'info', icon: 'trophy', text: 'Block complete: run the 12-week review and start Block 2 with your updated numbers.', onPress: () => router.push({ pathname: '/progress', params: { tab: 'review' } }) });
  if (ctx.holiday) alerts.push({ key: 'holiday', tone: 'info', icon: 'star', text: 'Holiday week: maintenance calories (+300). Restart with the next planned meal.' });
  if (ctx.deload) alerts.push({ key: 'deload', tone: 'info', icon: 'moon', text: 'Deload week: lighter on purpose.' });
  if (missedYesterday && !showMorning) alerts.push({ key: 'newday', tone: 'success', icon: 'bolt', text: `New day, same plan.${nextMeal ? ` Next up: ${nextMeal.name}.` : ''}` });

  const eat = (slot: Slot, mealId: string) => {
    const cur = log?.meals[slot];
    if (cur && cur.status !== 'skipped') {
      st.setMeal(date, slot, null);
      return;
    }
    st.setMeal(date, slot, { status: 'eaten', mealId });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const dayLabel = isToday ? `Today, ${formatShort(date)}` : formatLong(date);

  return (
    <Screen>
      <ScreenHeader
        title={`Hi, ${data.profile.name}`}
        subtitle={`${greeting()} · ${week > 12 ? 'Block complete' : `Week ${Math.max(1, week)}, ${ctx.phaseName}`} · ${ctx.dayTypeLabel}`}
        right={
          <Pressable onPress={() => router.push('/badges')} accessibilityRole="button" accessibilityLabel={`Streak ${streak.current} days. Open badges.`}>
            <Row gap={4} style={{ backgroundColor: c.accentSoft, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 48 }}>
              <Icon name="flame" color={c.accent} size={20} />
              <T v="bodyStrong">{streak.current}</T>
            </Row>
          </Pressable>
        }
      />
      <T v="label" muted>
        {DAILY_MESSAGES[msgIdx]}
        {data.settings.arabic ? `  ${ARABIC_PHRASES[msgIdx % ARABIC_PHRASES.length]}` : ''}
      </T>

      <Row style={{ justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border }}>
        <IconButton name="left" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
        <Pressable onPress={() => setDate(today)} accessibilityRole="button" accessibilityLabel="Back to today">
          <T v="bodyStrong">{dayLabel}</T>
        </Pressable>
        <IconButton name="right" label="Next day" onPress={() => date < today && setDate(addDays(date, 1))} color={date < today ? c.text : c.border} />
      </Row>

      <AlertStack items={alerts} />

      {showMorning && ySum ? (
        <Card tone="alt">
          <T v="heading">Morning check-in</T>
          <T>
            Yesterday scored {ySum.score.total}
            {ySum.workout ? ` with a ${ySum.workout} workout` : ySum.ctx.isGym ? ', workout missed' : ''}
            {ySum.protein < ySum.ctx.proteinTarget - 20 ? `, protein ${Math.round(ySum.ctx.proteinTarget - ySum.protein)} g short` : ''}.
          </T>
          <T muted>
            Today: {ctx.kcalTarget.toLocaleString('en-US')} kcal, {ctx.proteinTarget} g protein, {ctx.stepTarget.toLocaleString('en-US')} steps.
          </T>
          <Row>
            <Button label={data.body[today]?.weight ? 'Weighed in ✓' : 'Log weight'} icon="scale" small onPress={() => router.push('/log')} flex />
            <Button label="Got it" small variant="ghost" onPress={() => st.updateDay(today, { morningSeen: true })} flex />
          </Row>
        </Card>
      ) : null}

      {/* Score and targets */}
      <Card>
        <Row style={{ alignItems: 'center' }}>
          <Ring size={88} stroke={9} pct={sum.score.total / 100} color={sum.score.total >= 70 ? c.emerald : c.primary} label={`Day score ${sum.score.total} of 100`}>
            <T v="number">{sum.score.total}</T>
            <T v="caption" muted>score</T>
          </Ring>
          <View style={{ flex: 1, gap: space.sm, paddingLeft: space.md }}>
            <ProgressBar label="Calories" value={sum.kcal} max={ctx.kcalTarget} valueText={`${sum.kcal} / ${ctx.kcalTarget}`} color={sum.kcal > ctx.kcalTarget + 150 ? c.warning : undefined} />
            <ProgressBar label="Protein" value={sum.protein} max={ctx.proteinTarget} valueText={`${sum.protein} / ${ctx.proteinTarget} g`} />
            <ProgressBar label="Steps" value={log?.steps ?? 0} max={ctx.stepTarget} valueText={`${(log?.steps ?? 0).toLocaleString('en-US')} / ${ctx.stepTarget.toLocaleString('en-US')}`} />
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm }}>
          <Row gap={6} style={{ flex: 1 }}>
            <Icon name="drop" color={c.primary} />
            <T v="bodyStrong">Water {log?.water ?? 0}/10</T>
          </Row>
          <IconButton name="minus" label="Remove a glass of water" onPress={() => st.addWater(date, -1)} color={c.primary} />
          <IconButton
            name="plus"
            label="Add a glass of water (250 ml)"
            onPress={() => {
              st.addWater(date, 1);
              Haptics.selectionAsync().catch(() => {});
            }}
            color={c.primary}
          />
        </Row>
        {data.adjust.kcalAdjust !== 0 ? (
          <T v="caption" muted>
            Target {plannedKcal.toLocaleString('en-US')} {data.adjust.kcalAdjust < 0 ? 'minus' : 'plus'} {Math.abs(data.adjust.kcalAdjust)} (coach adjustment)
            {data.adjust.kcalAdjust < 0 ? `. How: ${kcalRemovalSuggestions(data.adjust.kcalAdjust).join('; ').toLowerCase()}.` : ''}
          </T>
        ) : null}
      </Card>

      {/* Up next */}
      <SectionTitle right={<Button label="All meals" small variant="ghost" onPress={() => router.push('/food')} />}>Food</SectionTitle>
      <Card>
        {nextSlot && nextMeal ? (
          <>
            <T v="caption" muted>
              UP NEXT · {SLOT_INFO[nextSlot.slot].time} {SLOT_INFO[nextSlot.slot].label}
            </T>
            <T v="heading">{nextMeal.name}</T>
            <T muted>{nextMeal.desc}</T>
            <T v="label">
              {nextMeal.kcal} kcal · {nextMeal.protein} g protein
            </T>
            <Row>
              <Button label="Ate it" icon="check" small onPress={() => eat(nextSlot.slot, nextSlot.mealId)} flex />
              <Button label="Plan B" icon="swap" small variant="secondary" onPress={() => setPlanB({ slot: nextSlot.slot, mealId: nextSlot.mealId })} flex />
            </Row>
          </>
        ) : (
          <T v="bodyStrong">All meals logged for this day. Nice.</T>
        )}
        <T v="caption" muted>
          {ctx.slots.filter((s) => log?.meals[s.slot] && log.meals[s.slot]?.status !== 'skipped').length}/{ctx.slots.length} meals done
          {(log?.extras?.length ?? 0) ? ` · ${log?.extras?.length} extra` : ''}
        </T>
      </Card>

      {/* Training */}
      <SectionTitle>Gym</SectionTitle>
      <Card onPress={() => router.push('/gym')} accessibilityLabel="Open gym">
        <Row>
          <Icon name={ctx.isGym ? 'train' : 'walk'} color={c.primary} />
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{ctx.dayTypeLabel}</T>
            <T v="caption" muted>
              {sum.workout
                ? `Done: ${sum.workout === 'full' ? 'full workout' : sum.workout === 'minimum' ? 'minimum version' : 'walk'}`
                : ctx.isGym
                  ? 'Tired after work? The 30-minute minimum version still counts.'
                  : `Easy cardio ${log?.cardioMinutes ?? 0}/${ctx.cardioTarget} min. Talk test: full sentences.`}
            </T>
          </View>
          <Icon name={sum.workout ? 'check' : 'right'} color={sum.workout ? c.success : c.textMuted} />
        </Row>
      </Card>

      {/* Coach */}
      <SectionTitle>Coach</SectionTitle>
      <Card onPress={() => router.push({ pathname: '/progress', params: { tab: 'review' } })} accessibilityLabel="Open coach review">
        <Row>
          <Icon name="coach" color={c.primary} />
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{coach.review.headline}</T>
            <T v="caption" muted>{coach.pending.length ? `${coach.pending.length} suggested change${coach.pending.length > 1 ? 's' : ''} waiting for you` : 'No changes needed right now. Tap to ask the coach.'}</T>
          </View>
          <Icon name="right" color={c.textMuted} />
        </Row>
      </Card>

      {/* This week */}
      <SectionTitle>This week</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          {[
            { label: 'Workouts', value: wk.workouts.credit, goal: 4, text: `${wk.workouts.credit}/4` },
            { label: 'On plan', value: wk.daysOnPlan, goal: 7, text: `${wk.daysOnPlan}/7` },
            { label: 'Steps avg', value: wk.avgSteps ?? 0, goal: ctx.stepTarget, text: wk.avgSteps != null ? `${Math.round(wk.avgSteps / 100) / 10}k` : '–' },
            { label: 'Weigh-ins', value: wk.weighIns, goal: 7, text: `${wk.weighIns}/7` },
          ].map((g) => {
            const met = g.value >= g.goal;
            return (
              <View key={g.label} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <Ring size={56} stroke={6} pct={g.goal ? g.value / g.goal : 0} color={met ? c.accent : c.primary} label={`${g.label}: ${g.text}${met ? ', goal met' : ''}`}>
                  {met ? <Icon name="check" color={c.accent} size={22} strokeWidth={3} /> : <T v="label">{g.text}</T>}
                </Ring>
                <T v="caption" muted center>{g.label}</T>
              </View>
            );
          })}
        </Row>
      </Card>

      <Row>
        <Button label="Log numbers" icon="plus" variant="secondary" onPress={() => router.push('/log')} flex />
        <Button label="Check-in" icon="check" variant="accent" onPress={() => router.push({ pathname: '/checkin', params: { date } })} flex />
      </Row>

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
    </Screen>
  );
}
