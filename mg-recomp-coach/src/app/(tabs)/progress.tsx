import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { addDays, diffDays, formatShort, todayISO, weekStart } from '../../engine/dates';
import { weeklyReport } from '../../engine/report';
import { completedWeeks, runReview, streaksAndXp, totalLost, weekStats } from '../../engine/selectors';
import { allMainLiftTrends } from '../../engine/strength';
import { weightBand } from '../../engine/targets';
import { useApp } from '../../store/useApp';
import { LineChart } from '../../ui/LineChart';
import { Banner, Button, Card, Chip, Empty, Row, Screen, ScreenHeader, SectionTitle, Stat, T } from '../../ui/kit';
import { space, useTheme } from '../../ui/theme';
import { useUnits } from '../../ui/units';


export default function Progress() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const u = useUnits();
  const fmtKg = u.fw;
  const today = todayISO();
  const start = data.profile.startDate ?? today;
  const [copied, setCopied] = useState(false);
  const [reportWeek, setReportWeek] = useState<'last' | 'this'>('last');

  const x = (d: string) => diffDays(start, d);
  const xFmt = (n: number) => formatShort(addDays(start, Math.round(n)));

  const weights = useMemo(
    () =>
      Object.keys(data.body)
        .filter((d) => data.body[d].weight != null && d >= addDays(start, -7))
        .sort()
        .map((d) => ({ date: d, w: data.body[d].weight as number })),
    [data.body, start],
  );
  const daily = weights.map((p) => ({ x: x(p.date), y: u.w(p.w), label: `${formatShort(p.date)}: ${u.fw(p.w)}` }));
  const ma = weights.map((p) => {
    const win = weights.filter((q) => q.date <= p.date && q.date > addDays(p.date, -7));
    const avg = win.reduce((a, q) => a + q.w, 0) / win.length;
    return { x: x(p.date), y: u.w(avg), label: `${formatShort(p.date)} 7-day avg: ${u.fw(avg)}` };
  });
  const band = useMemo(() => {
    const pts = [];
    const w0 = data.profile.startWeight;
    for (let t = 1; t <= 12; t++) {
      const b = weightBand(t, w0);
      pts.push({ x: (t - 1) * 7, low: u.w(b.low), high: u.w(b.high) }, { x: t * 7 - 1, low: u.w(b.low), high: u.w(b.high) });
    }
    const maxX = Math.max(30, ...daily.map((d) => d.x)) + 7;
    return pts.filter((p) => p.x <= maxX);
  }, [data.profile.startWeight, daily, u]);

  const waists = Object.keys(data.body)
    .filter((d) => data.body[d].waist != null)
    .sort()
    .map((d) => ({ x: x(d), y: u.l(data.body[d].waist as number), label: `${formatShort(d)}: ${u.fl(data.body[d].waist)}` }));

  const weeks = useMemo(() => completedWeeks(data, addDays(today, 1)), [data, today]);
  const review = useMemo(() => runReview(data, today), [data, today]);
  const streak = useMemo(() => streaksAndXp(data, today), [data, today]);
  const lifts = useMemo(() => allMainLiftTrends(data.workouts), [data.workouts]);
  const lost = totalLost(data, today);
  const thisWeek = weekStats(data, weekStart(today));
  const lastWeek = weekStats(data, addDays(weekStart(today), -7));
  const lostThisWeek = thisWeek.avgWeight != null && lastWeek.avgWeight != null ? lastWeek.avgWeight - thisWeek.avgWeight : null;
  const currentWeight = thisWeek.avgWeight ?? lastWeek.avgWeight;
  // Body-fat estimate: assume about 75% of lost weight is fat. Estimate only.
  const bfEst =
    lost != null && currentWeight != null
      ? Math.round((((data.profile.startWeight * data.profile.bodyFatEst) / 100 - lost * 0.75) / currentWeight) * 1000) / 10
      : null;
  const workoutsDone = data.workouts.filter((w) => w.finished && w.kind !== 'walk').length;

  const copyReport = async () => {
    const sunday = reportWeek === 'last' ? addDays(weekStart(today), -7) : weekStart(today);
    await Clipboard.setStringAsync(weeklyReport(data, sunday));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const weekX = (wk: { week: number }) => wk.week;

  return (
    <Screen>
      <ScreenHeader title="Progress" subtitle="Weekly averages, not single weigh-ins." />
      {data.settings.demoMode ? <Banner tone="accent" icon="star" text="Demo mode: these charts use fake data." /> : null}

      <Row wrap gap={space.sm}>
        <Stat label="Total lost (weekly avg)" value={fmtKg(lost)} />
        <Stat label="This week vs last" value={lostThisWeek != null ? fmtKg(-lostThisWeek, true) : '–'} />
        <Stat label="Rate (last 2 wks)" value={review.metrics.ratePerWeek != null ? `${review.metrics.ratePerWeek.toFixed(2)}` : '–'} sub="kg/week, positive = losing" />
        <Stat label="Distance from band" value={review.metrics.distanceFromBand != null ? fmtKg(review.metrics.distanceFromBand, true) : '–'} sub="vs expected value" />
        <Stat label="Body fat (estimate)" value={bfEst != null ? `${bfEst}%` : `${data.profile.bodyFatEst}%`} sub={`start ${data.profile.bodyFatEst}% (estimate, not measured)`} />
        <Stat label="Week 12 projection" value={review.metrics.projectedWeek12 != null ? fmtKg(review.metrics.projectedWeek12) : '–'} sub="estimate if the rate holds" />
        <Stat label="Workouts done" value={String(workoutsDone)} />
        <Stat label="Streak" value={`${streak.current} 🔥`} sub={`best ${streak.best}`} />
        <Stat label={`Level ${streak.level.level}`} value={streak.level.title} sub={`${streak.xp} XP · ${streak.level.into}/500 to next`} />
      </Row>
      <Row>
        <Button label="Badges" icon="trophy" variant="secondary" onPress={() => router.push('/badges')} flex />
        <Button label="Photos" icon="camera" variant="secondary" onPress={() => router.push('/photos')} flex />
      </Row>

      <SectionTitle>Weight</SectionTitle>
      <Card>
        <LineChart
          series={[
            { id: 'daily', points: daily, color: c.textMuted, width: 1, dots: true, name: 'Daily' },
            { id: 'ma', points: ma, color: c.primary, width: 3, name: '7-day average' },
          ]}
          band={band}
          baseline={{ y: u.w(data.profile.startWeight), label: `start ${u.fw(data.profile.startWeight)}` }}
          yFmt={(n) => n.toFixed(0)}
          xFmt={xFmt}
          emptyText="No weigh-ins yet. Weigh in tomorrow morning after the toilet."
          a11ySummary={`Weight chart. ${weights.length} weigh-ins. Latest ${weights.length ? weights[weights.length - 1].w : 'none'} kilograms.`}
        />
        <T v="caption" muted>Dots: daily weigh-ins. Line: 7-day average. Shaded: expected band (±1.5 kg). Dashed: start weight.</T>
      </Card>

      <SectionTitle>Waist</SectionTitle>
      <Card>
        <LineChart series={[{ id: 'waist', points: waists, color: c.emerald, dots: true }]} yFmt={(n) => n.toFixed(0)} xFmt={xFmt} emptyText="Measure your waist once a week (Quick log)." />
        <T v="caption" muted>Target: down 10-14 cm by week 12.</T>
      </Card>

      <SectionTitle>Strength (estimated, Epley)</SectionTitle>
      {lifts.every((l) => l.series.length === 0) ? (
        <Empty title="No lifts yet" text="Log your first workout in Train. Strength trends appear after two sessions." action="Go to Train" onPress={() => router.push('/train')} />
      ) : (
        lifts.map((l) =>
          l.series.length ? (
            <Card key={l.key}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="bodyStrong">{l.name}</T>
                <T v="label" color={(l.change ?? 0) >= 0 ? c.success : c.warning}>
                  {l.change != null ? `${l.change > 0 ? '+' : ''}${l.change}% vs first` : 'first session'}
                </T>
              </Row>
              <LineChart height={120} series={[{ id: l.key, points: l.series.map((p) => ({ x: x(p.date), y: p.value, label: `${formatShort(p.date)}: ${p.value} kg est.` })), color: c.accent, dots: true }]} xFmt={xFmt} />
            </Card>
          ) : null,
        )
      )}

      <SectionTitle>Weekly trends</SectionTitle>
      {weeks.length === 0 ? (
        <Empty title="First week in progress" text="Weekly averages show up after your first Sunday-to-Saturday week." />
      ) : (
        <>
          <Card>
            <T v="bodyStrong">Average steps per week</T>
            <LineChart height={120} series={[{ id: 'steps', points: weeks.filter((w) => w.avgSteps != null).map((w) => ({ x: weekX(w), y: w.avgSteps as number, label: `Week ${w.week}: ${w.avgSteps} steps` })), color: c.primary, dots: true }]} xFmt={(n) => `W${n}`} />
          </Card>
          <Card>
            <T v="bodyStrong">Days on plan per week</T>
            <LineChart height={120} series={[{ id: 'adh', points: weeks.map((w) => ({ x: weekX(w), y: w.daysOnPlan, label: `Week ${w.week}: ${w.daysOnPlan}/7 days` })), color: c.emerald, dots: true }]} xFmt={(n) => `W${n}`} yFmt={(n) => n.toFixed(0)} />
          </Card>
          <Card>
            <T v="bodyStrong">Average sleep per week</T>
            <LineChart height={120} series={[{ id: 'sleep', points: weeks.filter((w) => w.avgSleep != null).map((w) => ({ x: weekX(w), y: w.avgSleep as number, label: `Week ${w.week}: ${w.avgSleep} h` })), color: c.accent, dots: true }]} xFmt={(n) => `W${n}`} yFmt={(n) => n.toFixed(1)} />
          </Card>

          <SectionTitle>Weekly summary (Sun-Sat)</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <Row gap={0} style={{ borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 4 }}>
                {['Wk', 'Dates', `Avg ${u.wUnit}`, 'Band', 'Waist', 'Plan', 'Wkts', 'Steps', 'Sleep', 'Energy'].map((h) => (
                  <T key={h} v="label" style={{ width: h === 'Dates' ? 110 : h === 'Band' ? 96 : 64 }}>{h}</T>
                ))}
              </Row>
              {weeks.map((w) => {
                const b = weightBand(Math.max(1, Math.min(12, w.week)), data.profile.startWeight);
                return (
                  <Row key={w.weekStart} gap={0} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <T style={{ width: 64 }}>{w.week}</T>
                    <T style={{ width: 110 }}>{formatShort(w.weekStart)}–{formatShort(addDays(w.weekStart, 6))}</T>
                    <T style={{ width: 64 }}>{w.avgWeight != null ? u.w(w.avgWeight).toFixed(1) : `(${w.weighIns})`}</T>
                    <T style={{ width: 96 }}>{u.w(b.low).toFixed(1)}–{u.w(b.high).toFixed(1)}</T>
                    <T style={{ width: 64 }}>{w.waist != null ? u.l(w.waist) : '–'}</T>
                    <T style={{ width: 64 }}>{w.daysOnPlan}/7</T>
                    <T style={{ width: 64 }}>{w.workouts.credit}/4</T>
                    <T style={{ width: 64 }}>{w.avgSteps ?? '–'}</T>
                    <T style={{ width: 64 }}>{w.avgSleep ?? '–'}</T>
                    <T style={{ width: 64 }}>{w.avgEnergy ?? '–'}</T>
                  </Row>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}

      <SectionTitle>Weekly report</SectionTitle>
      <Card>
        <T muted>Copy a text report to paste into a Claude chat for a human-style review.</T>
        <Row>
          <Chip label="Last week" selected={reportWeek === 'last'} onPress={() => setReportWeek('last')} />
          <Chip label="This week so far" selected={reportWeek === 'this'} onPress={() => setReportWeek('this')} />
        </Row>
        <Button label={copied ? 'Copied!' : 'Copy weekly report'} icon={copied ? 'check' : 'copy'} onPress={copyReport} />
        <Button label="Backup and import (JSON)" variant="ghost" small onPress={() => router.push('/settings')} />
      </Card>

      <SectionTitle right={data.planChanges.some((p) => !p.undone) ? <Button label="Undo last" small variant="ghost" onPress={() => st.undoLastChange()} /> : undefined}>
        Plan changes
      </SectionTitle>
      {data.planChanges.length === 0 ? (
        <T muted>No changes yet. The coach proposes changes from week 3; you decide with Apply or Not now.</T>
      ) : (
        [...data.planChanges].reverse().map((p) => (
          <Card key={p.id} tone={p.undone ? 'alt' : 'default'}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyStrong">{p.type}: {String(p.old ?? '–')} → {String(p.new ?? '–')}</T>
              <T v="caption" muted>{p.date}</T>
            </Row>
            <T v="caption" muted>{p.reason}{p.undone ? ' (undone)' : ''}</T>
          </Card>
        ))
      )}

      <SectionTitle>Pain and symptom log</SectionTitle>
      {data.painFlags.length === 0 && data.redFlags.length === 0 ? (
        <T muted>Nothing logged. Use “Something hurt” any time.</T>
      ) : (
        [...data.painFlags.map((p) => ({ id: p.id, date: p.date, text: `${p.bodyPart}${p.exercise ? ` · ${p.exercise}` : ''}${p.note ? ` · ${p.note}` : ''}` })), ...data.redFlags.map((r) => ({ id: r.id, date: r.date, text: `⚠ ${r.symptom}` }))]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between' }}>
              <T style={{ flex: 1 }}>{p.text}</T>
              <T v="caption" muted>{p.date}</T>
            </Row>
          ))
      )}
    </Screen>
  );
}
