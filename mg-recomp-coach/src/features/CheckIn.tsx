// Weekly check-in: weekly average weight vs the week before, the 0.3-0.7 kg/week target, and calorie advice.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { addDays, todayISO, weekStart } from '../engine/dates';
import { LOSS_MAX, LOSS_MIN } from '../engine/targets';
import { latestWeight, runReview, weekStats } from '../engine/selectors';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Row, Stepper, T } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';
import { useUnits } from '../ui/units';
import { ProposalCard, useApplyProposal } from './CoachPanel';

const r1 = (n: number) => Math.round(n * 10) / 10;

export function QuickWeight() {
  const data = useApp((s) => s.data);
  const submit = useApp((s) => s.submit);
  const today = todayISO();
  const logged = data.body[today]?.weight;
  const start = logged ?? latestWeight(data)?.weight ?? data.profile.startWeight;
  const [w, setW] = useState(r1(start));
  const u = useUnits();
  return (
    <View style={{ gap: space.sm }}>
      <Stepper label="Smart scale today" value={w} step={0.1} min={30} max={300} onChange={(n) => setW(r1(n))} format={(n) => u.fw(n)} />
      <Button
        label={logged != null && Math.abs(logged - w) < 0.01 ? `Saved: ${u.fw(logged)}` : logged != null ? 'Update today’s weight' : 'Save today’s weight'}
        icon="scale"
        disabled={logged != null && Math.abs(logged - w) < 0.01}
        onPress={() => {
          submit(today, 'weight', w);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }}
      />
    </View>
  );
}

export function WeeklyCheckIn() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const u = useUnits();
  const apply = useApplyProposal();
  const today = todayISO();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const review = useMemo(() => runReview(data, today), [data, today]);
  const thisWeek = useMemo(() => weekStats(data, weekStart(today)), [data, today]);
  const lastWeek = useMemo(() => weekStats(data, addDays(weekStart(today), -7)), [data, today]);
  const m = review.metrics;
  const pending = review.proposals.filter((p) => !data.dismissed[p.id]);
  const change = m.changeVsPrev;
  const rate = m.ratePerWeek;
  const tone = rate == null ? c.textMuted : rate > LOSS_MAX ? c.warning : rate >= LOSS_MIN ? c.success : c.warning;

  // This week so far vs last week, when both have an average.
  const soFar = thisWeek.avgWeight != null && lastWeek.avgWeight != null ? r1(thisWeek.avgWeight - lastWeek.avgWeight) : null;

  return (
    <>
      <Card>
        <T v="caption" muted>WEEKLY CHECK-IN</T>
        <T v="title">{review.headline}</T>
        <Row wrap>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
            <T v="caption" muted>Last week avg</T>
            <T v="number">{m.latestAvg != null ? u.w(m.latestAvg).toFixed(1) : '–'}</T>
            <T v="caption" muted>{u.wUnit}</T>
          </View>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
            <T v="caption" muted>Week before</T>
            <T v="number">{m.prevAvg != null ? u.w(m.prevAvg).toFixed(1) : '–'}</T>
            <T v="caption" muted>{u.wUnit}</T>
          </View>
          <View style={{ flex: 1, minWidth: 100, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
            <T v="caption" muted>Change</T>
            <T v="number" color={tone}>{change != null ? `${change > 0 ? '+' : ''}${(u.imperial ? change / 0.45359237 : change).toFixed(2)}` : '–'}</T>
            <T v="caption" muted>{u.wUnit} / week</T>
          </View>
        </Row>
        <T v="label" muted>Target: lose {LOSS_MIN}–{LOSS_MAX} kg per week (weekly average, not one weigh-in).</T>
        {review.messages.map((msg, i) => (
          <T key={i}>{msg}</T>
        ))}
        <T v="caption" muted>
          This week so far: {thisWeek.avgWeight != null ? `${u.fw(thisWeek.avgWeight)} avg (${thisWeek.weighIns} weigh-ins)` : `${thisWeek.weighIns} weigh-in${thisWeek.weighIns === 1 ? '' : 's'}`}
          {soFar != null ? ` · ${soFar > 0 ? '+' : ''}${soFar} vs last week` : ''}
        </T>
      </Card>
      {pending.map((p) => (
        <ProposalCard
          key={p.id}
          p={p}
          error={errors[p.id]}
          onApply={() => {
            const err = apply(p);
            if (err) setErrors({ ...errors, [p.id]: err });
          }}
          onLater={() => st.dismiss(p.id, today)}
        />
      ))}
      {data.profile.startDate && review.status === 'noWeeks' ? <Banner tone="info" icon="scale" text="Weigh in on the smart scale daily, or at least 3 times a week. Your first check-in appears after your first full week (Sunday to Saturday)." /> : null}
      <Card>
        <QuickWeight />
      </Card>
    </>
  );
}
