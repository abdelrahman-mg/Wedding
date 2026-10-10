import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CRAVING_ROUTINE } from '../../data/guides';
import { getMeal, SLOT_INFO, type Slot } from '../../data/meals';
import { ARABIC_PHRASES, DAILY_MESSAGES } from '../../data/messages';
import { addDays, formatLong, programWeek, todayISO, weekDates, weekStart } from '../../engine/dates';
import { kcalRemovalSuggestions, proteinFix, plannedTotals } from '../../engine/nutrition';
import { daySummary, pickMessageIndex, streaksAndXp, weekStats } from '../../engine/selectors';
import { useApp } from '../../store/useApp';
import { BpSheet, SafetyButtons } from '../../features/SafetySheets';
import { PlanBSheet } from '../../features/PlanBSheet';
import { QuickLogSheet } from '../../features/QuickLogSheet';
import { Icon } from '../../ui/Icon';
import { Banner, Button, Card, Chip, IconButton, ProgressBar, Ring, Row, Screen, SectionTitle, Sheet, T } from '../../ui/kit';
import { radius, space, useTheme } from '../../ui/theme';
import { useUnits } from '../../ui/units';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const u = useUnits();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [planB, setPlanB] = useState<{ slot: Slot; mealId: string } | null>(null);
  const [quick, setQuick] = useState(false);
  const [bp, setBp] = useState(false);
  const [craving, setCraving] = useState(false);
  const [skipMsg, setSkipMsg] = useState<string | null>(null);

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

  // Morning check-in: before 11:00, once a day.
  const yesterday = addDays(today, -1);
  const showMorning = isToday && new Date().getHours() < 11 && !log?.morningSeen && yesterday >= start;
  const ySum = useMemo(() => (showMorning ? daySummary(data, yesterday) : null), [showMorning, data, yesterday]);
  const missedYesterday = isToday && yesterday >= start && daySummary(data, yesterday).score.total < 70;

  const bpChecked = !!data.checklist.doctor_bp?.done;
  const nextSlot = ctx.slots.find((s) => !log?.meals[s.slot]);
  const nextMeal = nextSlot ? getMeal(nextSlot.mealId) : undefined;

  const eat = (slot: Slot, mealId: string) => {
    const cur = log?.meals[slot];
    if (cur && cur.status !== 'skipped') {
      st.setMeal(date, slot, null);
      return;
    }
    st.setMeal(date, slot, { status: 'eaten', mealId });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const skip = (slot: Slot, mealId: string) => {
    const cur = log?.meals[slot];
    const curProtein =
      cur?.status === 'custom' ? cur.custom?.protein ?? 0 : cur && cur.status !== 'skipped' ? getMeal(cur.mealId ?? mealId)?.protein ?? 0 : 0;
    st.setMeal(date, slot, { status: 'skipped' });
    const m = getMeal(mealId);
    const stillPlanned = ctx.slots
      .filter((s) => s.slot !== slot && !log?.meals[s.slot])
      .reduce((a, s) => a + (getMeal(s.mealId)?.protein ?? 0), 0);
    const short = ctx.proteinTarget - (sum.protein - curProtein + stillPlanned);
    setSkipMsg(`${m?.name ?? 'Meal'} skipped. ${short > 0 ? proteinFix(short) + ' Move protein to your next slot.' : 'Protein is still covered by your remaining meals.'}`);
  };

  return (
    <Screen>
      {/* Header */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="display">
            {greeting()}, {data.profile.name}
          </T>
          {data.settings.arabic ? <T muted>{ARABIC_PHRASES[msgIdx % ARABIC_PHRASES.length]}</T> : null}
        </View>
        <Pressable onPress={() => router.push('/badges')} accessibilityRole="button" accessibilityLabel={`Streak ${streak.current} days. Open badges.`}>
          <View style={{ alignItems: 'center', backgroundColor: c.accentSoft, borderRadius: radius.md, padding: space.sm, minWidth: 56 }}>
            <Icon name="flame" color={c.accent} size={24} />
            <T v="bodyStrong">{streak.current}</T>
          </View>
        </Pressable>
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton name="left" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <T v="bodyStrong">{isToday ? `Today · ${formatLong(date)}` : formatLong(date)}</T>
          <T v="caption" muted>
            {week > 12 ? 'Block complete' : `Week ${Math.max(1, week)} · ${ctx.phaseName}`} · {ctx.dayTypeLabel}
          </T>
        </View>
        <IconButton name="right" label="Next day" onPress={() => date < today && setDate(addDays(date, 1))} color={date < today ? c.text : c.border} />
      </Row>
      {!isToday ? <Button label="Back to today" small variant="ghost" onPress={() => setDate(today)} /> : null}

      {/* Banners */}
      {data.settings.demoMode ? <Banner tone="accent" icon="star" text="DEMO MODE: fake data. Turn it off in Settings to return to your real logs." onPress={() => router.push('/settings')} /> : null}
      {!bpChecked ? (
        <Banner tone="warning" text="BP not yet checked by a doctor: keep workouts moderate, no heavy straining or breath-holding." action="Health checks" onPress={() => router.push('/health')} />
      ) : null}
      {week > 12 ? <Banner tone="info" icon="trophy" text="Block complete: run the 12-week review and start Block 2 with your updated numbers." onPress={() => router.push('/coach')} /> : null}
      {ctx.holiday ? <Banner tone="info" icon="star" text="Holiday week: maintenance calories (+300). Enjoy it, and restart tomorrow with the next planned meal." /> : null}
      {ctx.deload ? <Banner tone="info" icon="moon" text="Deload week: lighter on purpose." /> : null}
      {missedYesterday && !showMorning ? <Banner tone="info" icon="bolt" text={`New day, same plan.${nextMeal ? ` Next up: ${nextMeal.name}.` : ''}`} /> : null}

      {/* Morning check-in */}
      {showMorning && ySum ? (
        <Card tone="alt">
          <T v="heading">Morning check-in</T>
          <T>
            Yesterday: score {ySum.score.total}
            {ySum.workout ? `, workout: ${ySum.workout}` : ySum.ctx.isGym ? ', workout missed' : ''}
            {ySum.protein < ySum.ctx.proteinTarget - 20 ? `, protein ${Math.round(ySum.ctx.proteinTarget - ySum.protein)} g short` : ''}.
          </T>
          <T muted>
            Today: {ctx.dayTypeLabel}. {ctx.kcalTarget} kcal, {ctx.proteinTarget} g protein, {ctx.stepTarget.toLocaleString('en-US')} steps.
          </T>
          <Row>
            <Button label={data.body[today]?.weight ? `Weighed: ${u.fw(data.body[today]?.weight)}` : 'Log weight'} icon="scale" small onPress={() => setQuick(true)} />
            <Button label="Got it" small variant="ghost" onPress={() => st.updateDay(today, { morningSeen: true })} />
          </Row>
        </Card>
      ) : null}

      {/* Daily line */}
      <Card tone="accent">
        <T v="bodyStrong">{DAILY_MESSAGES[msgIdx]}</T>
      </Card>

      {/* Targets */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Ring size={84} stroke={9} pct={sum.score.total / 100} color={sum.score.total >= 70 ? c.emerald : c.primary} label={`Day score ${sum.score.total} of 100`}>
            <T v="number">{sum.score.total}</T>
          </Ring>
          <View style={{ flex: 1, gap: space.sm, paddingLeft: space.md }}>
            <ProgressBar
              label="Calories"
              value={sum.kcal}
              max={ctx.kcalTarget}
              valueText={`${sum.kcal} / ${ctx.kcalTarget}`}
              color={sum.kcal > ctx.kcalTarget + 150 ? c.warning : undefined}
            />
            <ProgressBar label="Protein" value={sum.protein} max={ctx.proteinTarget} valueText={`${sum.protein} / ${ctx.proteinTarget} g`} />
          </View>
        </Row>
        {data.adjust.kcalAdjust !== 0 ? (
          <T v="caption" muted>
            Target {plannedKcal.toLocaleString('en-US')} {data.adjust.kcalAdjust < 0 ? 'minus' : 'plus'} {Math.abs(data.adjust.kcalAdjust)} (coach adjustment)
          </T>
        ) : null}
        {data.adjust.kcalAdjust < 0 ? (
          <View>
            <T v="label">How: remove, don’t shrink</T>
            {kcalRemovalSuggestions(data.adjust.kcalAdjust).map((s) => (
              <T key={s} v="caption" muted>
                • {s}
              </T>
            ))}
          </View>
        ) : null}
        <ProgressBar label="Steps" value={log?.steps ?? 0} max={ctx.stepTarget} valueText={`${(log?.steps ?? 0).toLocaleString('en-US')} / ${ctx.stepTarget.toLocaleString('en-US')}`} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}>
            <Icon name="drop" color={c.primary} />
            <T v="bodyStrong">Water {log?.water ?? 0} / 10 glasses</T>
          </Row>
          <Row gap={0}>
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
        </Row>
        <Row gap={4}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < (log?.water ?? 0) ? c.primary : c.track }} />
          ))}
        </Row>
      </Card>

      {/* Weekly goal rings */}
      <Card>
        <T v="label" muted>THIS WEEK (SUN-SAT)</T>
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
                <Ring size={58} stroke={7} pct={g.goal ? g.value / g.goal : 0} color={met ? c.accent : c.primary} label={`${g.label}: ${g.text}${met ? ', goal met' : ''}`}>
                  {met ? <Icon name="check" color={c.accent} size={22} strokeWidth={3} /> : <T v="label">{g.text}</T>}
                </Ring>
                <T v="caption" muted center>{g.label}</T>
              </View>
            );
          })}
        </Row>
      </Card>

      {/* Meals */}
      <SectionTitle>Meals</SectionTitle>
      {skipMsg ? <Banner tone="info" text={skipMsg} onPress={() => setSkipMsg(null)} action="Dismiss" /> : null}
      {ctx.slots.map((s) => {
        const planned = getMeal(s.mealId);
        if (!planned) return null;
        const entry = log?.meals[s.slot];
        const replacement = entry?.status === 'planB' && entry.mealId ? getMeal(entry.mealId) : undefined;
        const done = !!entry && entry.status !== 'skipped';
        const shown = replacement ?? planned;
        return (
          <Card key={s.slot} style={done ? { borderColor: c.emerald } : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label" muted>
                {SLOT_INFO[s.slot].label.toUpperCase()} · {SLOT_INFO[s.slot].time}
              </T>
              {entry?.status === 'planB' ? <T v="label" color={c.primary}>PLAN B</T> : null}
              {entry?.status === 'custom' ? <T v="label" color={c.primary}>CUSTOM</T> : null}
              {entry?.status === 'skipped' ? <T v="label" color={c.warning}>SKIPPED</T> : null}
            </Row>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="heading">{entry?.status === 'custom' ? entry.custom?.name : shown.name}</T>
                {entry?.status !== 'custom' ? <T muted>{shown.desc}</T> : null}
                <T v="label">
                  {entry?.status === 'custom' ? `${entry.custom?.kcal} kcal · ${entry.custom?.protein} g protein` : `${shown.kcal} kcal · ${shown.protein} g protein`}
                </T>
              </View>
              <Pressable
                onPress={() => eat(s.slot, s.mealId)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`Ate it: ${planned.name}`}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  borderWidth: 2,
                  borderColor: done ? c.emerald : c.border,
                  backgroundColor: done ? c.emerald : c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" color={done ? '#fff' : c.textMuted} size={28} strokeWidth={2.5} />
              </Pressable>
            </Row>
            <Row>
              <Button label="Plan B" icon="swap" small variant="secondary" onPress={() => setPlanB({ slot: s.slot, mealId: s.mealId })} flex />
              <Button label="Skip" small variant="ghost" onPress={() => skip(s.slot, s.mealId)} flex />
            </Row>
          </Card>
        );
      })}

      {/* Training */}
      <SectionTitle>Training</SectionTitle>
      <Card onPress={() => router.push('/train')} accessibilityLabel="Open training">
        <Row>
          <Icon name={ctx.isGym ? 'train' : 'walk'} color={c.primary} />
          <T v="heading" style={{ flex: 1 }}>
            {ctx.dayTypeLabel}
          </T>
          {sum.workout ? <T v="label" color={c.success}>DONE ({sum.workout})</T> : null}
        </Row>
        <T muted>
          {ctx.isGym
            ? 'Tired after work? The 30-minute minimum version still counts.'
            : `Easy cardio: ${ctx.cardioTarget} min (logged ${log?.cardioMinutes ?? 0}). Talk test: full sentences.`}
        </T>
      </Card>

      {/* Quick log */}
      <SectionTitle>Quick log</SectionTitle>
      <Card>
        <Row wrap>
          <Chip label={`Steps ${log?.steps != null ? log.steps.toLocaleString('en-US') : '–'}`} icon="walk" onPress={() => setQuick(true)} />
          <Chip label={`Sleep ${log?.sleep ?? '–'} h`} icon="moon" onPress={() => setQuick(true)} />
          <Chip label={`Weight ${u.fw(data.body[date]?.weight)}`} icon="scale" onPress={() => setQuick(true)} />
          <Chip label={`Energy ${log?.energy ?? '–'}`} icon="bolt" onPress={() => setQuick(true)} />
          <Chip label={`Hunger ${log?.hunger ?? '–'}`} onPress={() => setQuick(true)} />
          <Chip label={`Waist ${u.fl(data.body[date]?.waist)}`} onPress={() => setQuick(true)} />
          <Chip label="Note" onPress={() => setQuick(true)} />
          <Chip label="Blood pressure" icon="heart" onPress={() => setBp(true)} />
        </Row>
        <T v="label" style={{ marginTop: space.sm }}>
          Oil measured today?
        </T>
        <Row wrap>
          <Chip label="Yes" selected={log?.oilMeasured === true} onPress={() => st.updateDay(date, { oilMeasured: true, oilTsp: log?.oilTsp ?? 3 })} />
          <Chip label="No" selected={log?.oilMeasured === false} onPress={() => st.updateDay(date, { oilMeasured: false })} />
          {log?.oilMeasured ? (
            <Row gap={0}>
              <IconButton name="minus" label="Less oil" onPress={() => st.updateDay(date, { oilTsp: Math.max(0, (log?.oilTsp ?? 0) - 1) })} color={c.primary} />
              <T v="bodyStrong" color={(log?.oilTsp ?? 0) > 4 ? c.warning : c.text}>
                {log?.oilTsp ?? 0} tsp {(log?.oilTsp ?? 0) <= 4 ? '✓' : '(goal 4 or fewer)'}
              </T>
              <IconButton name="plus" label="More oil" onPress={() => st.updateDay(date, { oilTsp: (log?.oilTsp ?? 0) + 1 })} color={c.primary} />
            </Row>
          ) : null}
        </Row>
      </Card>

      <Row>
        <Button label="I have a craving" icon="bolt" variant="secondary" onPress={() => { setCraving(true); st.updateDay(date, { cravings: (log?.cravings ?? 0) + 1 }); }} flex />
      </Row>
      <SafetyButtons date={date} />

      <Button label="End-of-day check-in" icon="check" variant="accent" onPress={() => router.push({ pathname: '/checkin', params: { date } })} />

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
      <QuickLogSheet visible={quick} onClose={() => setQuick(false)} date={date} />
      <BpSheet visible={bp} onClose={() => setBp(false)} date={date} />
      <Sheet visible={craving} onClose={() => setCraving(false)} title="Craving? 10-minute routine">
        {CRAVING_ROUTINE.map((l, i) => (
          <Card key={i} tone="alt">
            <T v="bodyStrong">
              {i + 1}. {l}
            </T>
          </Card>
        ))}
        {nextMeal ? <T muted>Your next planned meal: {nextMeal.name} ({nextMeal.kcal} kcal).</T> : null}
        <Button label="Done, craving handled" onPress={() => setCraving(false)} />
      </Sheet>
    </Screen>
  );
}
