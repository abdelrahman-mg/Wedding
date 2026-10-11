import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CARDIO_TYPES, COOLDOWN, LIFT_SESSIONS, LOWER_SESSIONS, MOBILITY, SESSIONS, WALK_FALLBACK, WARMUP, type SessionKey } from '../../data/sessions';
import { addDays, todayISO } from '../../engine/dates';
import { liftingModeLabel } from '../../engine/phase';
import { dayContext, workoutKindOn } from '../../engine/selectors';
import { useApp } from '../../store/useApp';
import { WorkoutView } from '../../features/Workout';
import { SafetyButtons } from '../../features/SafetySheets';
import { Icon } from '../../ui/Icon';
import { Banner, Button, Card, Chip, Field, num, Row, Screen, ScreenHeader, SectionTitle, Sheet, T, ToggleRow } from '../../ui/kit';
import { space, useTheme } from '../../ui/theme';

function Collapsible({ title, items, defaultOpen = false }: { title: string; items: string[]; defaultOpen?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  return (
    <Card>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="heading">{title}</T>
          <Icon name={open ? 'up' : 'down'} color={c.text} />
        </Row>
      </Pressable>
      {open
        ? items.map((it, i) => (
            <Pressable key={i} onPress={() => setChecked({ ...checked, [i]: !checked[i] })} accessibilityRole="checkbox" accessibilityState={{ checked: !!checked[i] }} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Row>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: checked[i] ? c.emerald : c.border, backgroundColor: checked[i] ? c.emerald : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {checked[i] ? <Icon name="check" size={16} color="#fff" /> : null}
                </View>
                <T style={{ flex: 1, textDecorationLine: checked[i] ? 'line-through' : 'none' }}>{it}</T>
              </Row>
            </Pressable>
          ))
        : null}
    </Card>
  );
}

function CardioCard({ date, target }: { date: string; target: number }) {
  const { c } = useTheme();
  const log = useApp((s) => s.data.dayLogs[date]);
  const updateDay = useApp((s) => s.updateDay);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [manual, setManual] = useState('');
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const running = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const logged = log?.cardioMinutes ?? 0;
  return (
    <Card>
      <Row>
        <Icon name="walk" color={c.primary} />
        <T v="heading" style={{ flex: 1 }}>
          Easy cardio · {target} min
        </T>
        <T v="label" color={logged >= target ? c.success : c.textMuted}>
          {logged}/{target} min
        </T>
      </Row>
      <T muted>Incline treadmill walk, bike or elliptical. Talk test: you can speak full sentences. No running, no jumping, no HIIT.</T>
      <Row wrap>
        {CARDIO_TYPES.map((t) => (
          <Chip key={t} label={t} selected={log?.cardioType === t} onPress={() => updateDay(date, { cardioType: t })} />
        ))}
      </Row>
      {startedAt ? (
        <>
          <T v="display" center>
            {Math.floor(running / 60)}:{String(running % 60).padStart(2, '0')}
          </T>
          <Button
            label="Stop and log"
            icon="check"
            onPress={() => {
              updateDay(date, { cardioMinutes: logged + Math.max(1, Math.round(running / 60)) });
              setStartedAt(null);
            }}
          />
        </>
      ) : (
        <Button label="Start timer" icon="timer" onPress={() => { setStartedAt(Date.now()); setNow(Date.now()); }} />
      )}
      <Row>
        <Field label="Or add minutes" value={manual} onChange={setManual} keyboard="number-pad" suffix="min" />
        <Button
          label="Add"
          small
          style={{ alignSelf: 'flex-end' }}
          onPress={() => {
            const m = num(manual);
            if (m && m > 0) updateDay(date, { cardioMinutes: Math.min(180, logged + Math.round(m)) });
            setManual('');
          }}
        />
      </Row>
    </Card>
  );
}

export default function Train() {
  const data = useApp((s) => s.data);
  const active = useApp((s) => s.active);
  const st = useApp.getState();
  const today = todayISO();
  const ctx = useMemo(() => dayContext(data, today), [data, today]);
  const done = workoutKindOn(data.workouts, today);
  const [walkSheet, setWalkSheet] = useState(false);
  const [switchMsg, setSwitchMsg] = useState<string | null>(null);

  const deload = ctx.deload;

  const start = (key: SessionKey, kind: 'full' | 'minimum') => {
    st.startWorkout(today, key, kind, deload);
  };

  const isLowerOn = (date: string) => {
    const c2 = dayContext(data, date);
    const doneLower = data.workouts.some((w) => w.date === date && w.finished && LOWER_SESSIONS.includes(w.sessionKey));
    return doneLower || (c2.session != null && LOWER_SESSIONS.includes(c2.session));
  };

  const switchTo = (key: SessionKey) => {
    if (LOWER_SESSIONS.includes(key) && (isLowerOn(addDays(today, -1)) || isLowerOn(addDays(today, 1)))) {
      setSwitchMsg('Two lower sessions on back-to-back days are not allowed (knee recovery). Pick an upper session or move tomorrow’s first.');
      return;
    }
    setSwitchMsg(null);
    st.updateDay(today, { sessionOverride: key });
  };

  if (active) {
    return (
      <Screen>
        <WorkoutView week={ctx.roadmapWeek} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Train" subtitle={`Week ${ctx.roadmapWeek} · ${ctx.phaseName} · ${liftingModeLabel(ctx.roadmapWeek, deload)}`} />
      {deload ? <Banner tone="info" icon="moon" text="Deload week: lighter on purpose." /> : null}
      {done ? <Banner tone="success" icon="check" text={`Done today: ${done === 'full' ? 'full workout' : done === 'minimum' ? 'minimum version' : 'walk fallback'}. Recovery now: protein, water, sleep.`} /> : null}
      {ctx.isGym && done ? (
        <Card tone="alt">
          <ToggleRow
            label="Optional: 20-min walk after lifting"
            sub="Easy pace, talk test. Worth +2 bonus points."
            value={!!data.dayLogs[today]?.postLiftWalk}
            onChange={(v) => st.updateDay(today, { postLiftWalk: v })}
          />
        </Card>
      ) : null}

      {ctx.session ? (
        <Card>
          <T v="caption" muted>TODAY</T>
          <T v="title">{SESSIONS[ctx.session].name}</T>
          <T muted>
            About {SESSIONS[ctx.session].minutes} min · {SESSIONS[ctx.session].exercises.length} exercises
          </T>
          <Button label={`Start ${SESSIONS[ctx.session].name}`} icon="bolt" onPress={() => start(ctx.session as SessionKey, 'full')} />
          <Button label="Minimum version (30 min)" icon="timer" variant="accent" onPress={() => start('MINIMUM', 'minimum')} />
          <T v="caption" muted>Leg press 2x10, chest press 2x10, seated row 2x10, plank 2x30 s. Counts as a workout (70% credit).</T>
          <Button label="I can’t go to the gym today" variant="ghost" onPress={() => setWalkSheet(true)} />
          <Button label="Skip this gym day" variant="ghost" small onPress={() => st.updateDay(today, { sessionOverride: 'skip' })} />
        </Card>
      ) : (
        <>
          {ctx.skipped ? (
            <Banner tone="info" text="Gym day skipped. A walk still counts: do the walk fallback below." action="Undo skip" onPress={() => st.updateDay(today, { sessionOverride: undefined })} />
          ) : null}
          <CardioCard date={today} target={ctx.cardioTarget} />
          {ctx.skipped ? <Button label="Do the walk fallback" variant="secondary" onPress={() => setWalkSheet(true)} /> : null}
        </>
      )}

      <SectionTitle>Do a different session today</SectionTitle>
      <Row wrap>
        {LIFT_SESSIONS.map((k) => (
          <Chip key={k} label={SESSIONS[k].name} selected={ctx.session === k} onPress={() => switchTo(k)} />
        ))}
        {ctx.session && data.plan.sessionDays[ctx.dow] !== ctx.session ? <Chip label="Back to plan" onPress={() => st.updateDay(today, { sessionOverride: undefined })} /> : null}
      </Row>
      {switchMsg ? <Banner tone="warning" text={switchMsg} /> : null}

      {ctx.roadmapWeek === 1 && !data.strengthTests.baseline ? (
        <Card tone="alt" onPress={() => router.push({ pathname: '/strength-test', params: { which: 'baseline' } })} accessibilityLabel="Record baseline strength test">
          <T v="heading">Optional: baseline test</T>
          <T muted>Incline push-ups, leg press 10-rep weight, seated row 10-rep weight, plank hold. Week 12 compares against it.</T>
        </Card>
      ) : null}
      {ctx.roadmapWeek === 12 && (ctx.dow === 5 || ctx.dow === 6) ? (
        <Card tone="accent" onPress={() => router.push({ pathname: '/strength-test', params: { which: 'final' } })} accessibilityLabel="Record week 12 strength test">
          <T v="heading">Week 12 strength test</T>
          <T>After the deload sets: max clean incline push-ups, leg press 10-rep weight, seated row 10-rep weight, plank hold.</T>
        </Card>
      ) : null}

      <Collapsible title="Warm-up (not logged)" items={WARMUP} />
      <Collapsible title="Mobility (5 min, 3-4x a week)" items={[...MOBILITY, `Cool-down: ${COOLDOWN}`]} />

      <Row>
        <Button label="Workout history" variant="secondary" icon="progress" onPress={() => router.push('/history')} flex />
      </Row>
      <SafetyButtons date={today} />

      <Sheet visible={walkSheet} onClose={() => setWalkSheet(false)} title="Walk fallback">
        <T muted>Can’t make it? This keeps the habit alive and counts for 40% of workout points.</T>
        {WALK_FALLBACK.map((w) => (
          <Card key={w} tone="alt">
            <T v="bodyStrong">{w}</T>
          </Card>
        ))}
        <Button
          label="Done: log it"
          icon="check"
          onPress={() => {
            st.logWalk(today);
            setWalkSheet(false);
          }}
        />
      </Sheet>
      <View style={{ height: space.xl }} />
    </Screen>
  );
}
