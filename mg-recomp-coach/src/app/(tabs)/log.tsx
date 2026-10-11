// One place for every number MG tracks: body, activity, recovery, water, oil, BP, notes.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CRAVING_ROUTINE } from '../../data/guides';
import { CARDIO_TYPES } from '../../data/sessions';
import { addDays, formatLong, formatShort, todayISO } from '../../engine/dates';
import { bpStatus, isHighBp } from '../../engine/rules';
import { dayContext } from '../../engine/selectors';
import type { ISODate } from '../../engine/types';
import { PainSheet, RedFlagSheet } from '../../features/SafetySheets';
import { useApp } from '../../store/useApp';
import { Icon } from '../../ui/Icon';
import { Banner, Button, Card, Chip, Field, IconButton, num, Row, Screen, ScreenHeader, Segmented, Sheet, T, ToggleRow } from '../../ui/kit';
import { radius, space, useTheme } from '../../ui/theme';
import { useUnits } from '../../ui/units';

const SCALE = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }));

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <T v="heading">{title}</T>
      {hint ? <T v="caption" muted>{hint}</T> : null}
      {children}
    </Card>
  );
}

function LogForm({ date }: { date: ISODate }) {
  const { c } = useTheme();
  const u = useUnits();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const log = data.dayLogs[date];
  const body = data.body[date];
  const ctx = useMemo(() => dayContext(data, date), [data, date]);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState(() => ({
    weight: body?.weight != null ? String(u.w(body.weight)) : '',
    waist: body?.waist != null ? String(u.l(body.waist)) : '',
    steps: log?.steps != null ? String(log.steps) : '',
    cardio: log?.cardioMinutes != null ? String(log.cardioMinutes) : '',
    cardioType: log?.cardioType ?? null,
    sleep: log?.sleep != null ? String(log.sleep) : '',
    energy: log?.energy ?? null,
    hunger: log?.hunger ?? null,
    note: log?.note ?? '',
  }));
  const set = (patch: Partial<typeof f>) => {
    setSaved(false);
    setF((x) => ({ ...x, ...patch }));
  };

  const save = () => {
    const steps = num(f.steps);
    const sleep = num(f.sleep);
    const cardio = num(f.cardio);
    st.updateDay(date, {
      steps: steps != null ? Math.max(0, Math.round(steps)) : undefined,
      sleep: sleep != null ? Math.min(14, Math.max(0, sleep)) : undefined,
      cardioMinutes: cardio != null ? Math.min(180, Math.max(0, Math.round(cardio))) : undefined,
      cardioType: f.cardioType ?? undefined,
      energy: f.energy ?? undefined,
      hunger: f.hunger ?? undefined,
      note: f.note.trim() || undefined,
    });
    const w0 = num(f.weight);
    const wa0 = num(f.waist);
    const w = w0 != null ? Math.round(u.toKg(w0) * 10) / 10 : null;
    const wa = wa0 != null ? Math.round(u.toCm(wa0) * 10) / 10 : null;
    st.setBody(date, { weight: w != null && w > 30 && w < 300 ? w : null, waist: wa != null && wa > 40 && wa < 200 ? wa : null });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSaved(true);
  };

  return (
    <>
      <Section title="Body" hint="Weigh after the toilet, before breakfast. Waist once a week at the belly button.">
        <Row>
          <Field label="Weight" value={f.weight} onChange={(v) => set({ weight: v })} suffix={u.wUnit} />
          <Field label="Waist" value={f.waist} onChange={(v) => set({ waist: v })} suffix={u.lUnit} />
        </Row>
      </Section>

      <Section title="Activity" hint={`Targets today: ${ctx.stepTarget.toLocaleString('en-US')} steps${ctx.isGym ? '' : ` · ${ctx.cardioTarget} min easy cardio`}`}>
        <Row>
          <Field label="Steps" value={f.steps} onChange={(v) => set({ steps: v })} keyboard="number-pad" />
          <Field label="Cardio" value={f.cardio} onChange={(v) => set({ cardio: v })} keyboard="number-pad" suffix="min" />
        </Row>
        <Row wrap>
          {CARDIO_TYPES.map((t) => (
            <Chip key={t} label={t} selected={f.cardioType === t} onPress={() => set({ cardioType: f.cardioType === t ? null : t })} />
          ))}
        </Row>
        {ctx.isGym ? (
          <ToggleRow label="20-min walk after lifting" sub="Optional, +2 bonus points" value={!!log?.postLiftWalk} onChange={(v) => st.updateDay(date, { postLiftWalk: v })} />
        ) : null}
      </Section>

      <Section title="Recovery">
        <Field label="Sleep last night" value={f.sleep} onChange={(v) => set({ sleep: v })} suffix="hours" />
        <Segmented label="Energy (1 = drained, 5 = great)" value={f.energy} onChange={(v) => set({ energy: v })} options={SCALE} />
        <Segmented label="Hunger (1 = full, 5 = starving)" value={f.hunger} onChange={(v) => set({ hunger: v })} options={SCALE} />
      </Section>

      <Section title="Notes">
        <Field label="Anything worth remembering" value={f.note} onChange={(v) => set({ note: v })} keyboard="default" multiline placeholder="e.g. wedding dinner, slept badly, knee felt great" />
      </Section>

      {saved ? <Banner tone="success" icon="check" text={`Saved for ${formatLong(date)}.`} /> : null}
      <Button label="Save" icon="check" onPress={save} />

      <Section title="Water and oil" hint="These save as you tap.">
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}>
            <Icon name="drop" color={c.primary} />
            <T v="bodyStrong">{log?.water ?? 0} / 10 glasses</T>
          </Row>
          <Row gap={0}>
            <IconButton name="minus" label="Remove a glass of water" onPress={() => st.addWater(date, -1)} color={c.primary} />
            <IconButton name="plus" label="Add a glass of water (250 ml)" onPress={() => st.addWater(date, 1)} color={c.primary} />
          </Row>
        </Row>
        <T v="label">Oil measured with a teaspoon today?</T>
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
      </Section>
    </>
  );
}

function BpCard({ date }: { date: ISODate }) {
  const entries = useApp((s) => s.data.bp);
  const addBp = useApp((s) => s.addBp);
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [time, setTime] = useState<'morning' | 'evening'>(new Date().getHours() < 14 ? 'morning' : 'evening');
  const [symptoms, setSymptoms] = useState(false);
  const status = bpStatus(entries);
  const last = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const s = num(sys);
  const d = num(dia);
  return (
    <Section title="Blood pressure" hint="Sit quietly for 5 minutes, arm at heart level, then measure.">
      {last ? (
        <T v="label">
          Last: {last.systolic}/{last.diastolic} on {formatShort(last.date)} {isHighBp(last) ? '(high)' : ''}
        </T>
      ) : null}
      {entries.length ? <Banner tone={status.level === 'urgent' ? 'danger' : status.level === 'normal' ? 'success' : 'warning'} text={status.message} /> : null}
      <Row>
        <Field label="Top (sys)" value={sys} onChange={setSys} keyboard="number-pad" />
        <Field label="Bottom (dia)" value={dia} onChange={setDia} keyboard="number-pad" />
        <Field label="Pulse" value={pulse} onChange={setPulse} keyboard="number-pad" />
      </Row>
      <Segmented value={time} onChange={setTime} options={[{ label: 'Morning', value: 'morning' }, { label: 'Evening', value: 'evening' }]} />
      <ToggleRow label="Symptoms right now?" sub="Headache, chest pain, vision changes, dizziness" value={symptoms} onChange={setSymptoms} />
      <Button
        label="Add reading"
        variant="secondary"
        disabled={!s || !d}
        onPress={() => {
          if (!s || !d) return;
          addBp({ date, systolic: s, diastolic: d, pulse: num(pulse) ?? undefined, time, symptoms });
          setSys('');
          setDia('');
          setPulse('');
          setSymptoms(false);
        }}
      />
    </Section>
  );
}

function RecentDays({ date, onPick }: { date: ISODate; onPick: (d: ISODate) => void }) {
  const { c } = useTheme();
  const u = useUnits();
  const data = useApp((s) => s.data);
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter((d) => !data.profile.startDate || d >= addDays(data.profile.startDate, -1));
  return (
    <Section title="Last 7 days" hint="Tap a day to edit it.">
      <Row gap={0} style={{ paddingBottom: 4 }}>
        {['Day', 'Weight', 'Steps', 'Sleep', 'Water'].map((h) => (
          <T key={h} v="caption" muted style={{ flex: 1 }}>{h}</T>
        ))}
      </Row>
      {days.map((d) => {
        const l = data.dayLogs[d];
        const w = data.body[d]?.weight;
        const sel = d === date;
        return (
          <Pressable
            key={d}
            onPress={() => onPick(d)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${formatLong(d)}`}
            style={{ flexDirection: 'row', minHeight: 44, alignItems: 'center', borderRadius: radius.sm, backgroundColor: sel ? c.surfaceAlt : 'transparent' }}
          >
            <T v="label" style={{ flex: 1 }}>{d === today ? 'Today' : formatShort(d)}</T>
            <T style={{ flex: 1 }}>{w != null ? u.w(w) : '–'}</T>
            <T style={{ flex: 1 }}>{l?.steps != null ? `${Math.round(l.steps / 100) / 10}k` : '–'}</T>
            <T style={{ flex: 1 }}>{l?.sleep != null ? `${l.sleep}h` : '–'}</T>
            <T style={{ flex: 1 }}>{l?.water ?? 0}</T>
          </Pressable>
        );
      })}
    </Section>
  );
}

export default function Log() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const { c } = useTheme();
  const [pain, setPain] = useState(false);
  const [red, setRed] = useState(false);
  const [craving, setCraving] = useState(false);
  const updateDay = useApp((s) => s.updateDay);
  const cravings = useApp((s) => s.data.dayLogs[date]?.cravings ?? 0);

  return (
    <Screen>
      <ScreenHeader title="Log" subtitle="Everything you track, in one place." />
      <Row style={{ justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border }}>
        <IconButton name="left" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
        <T v="bodyStrong">{date === today ? `Today · ${formatShort(date)}` : formatLong(date)}</T>
        <IconButton name="right" label="Next day" onPress={() => date < today && setDate(addDays(date, 1))} color={date < today ? c.text : c.border} />
      </Row>

      <LogForm key={date} date={date} />
      <BpCard date={date} />

      <Section title="How are you feeling?">
        <Row wrap>
          <Chip
            label={`I have a craving${cravings ? ` (${cravings})` : ''}`}
            icon="bolt"
            onPress={() => {
              updateDay(date, { cravings: cravings + 1 });
              setCraving(true);
            }}
          />
          <Chip label="Something hurt" icon="alert" onPress={() => setPain(true)} />
          <Chip label="Something feels wrong" icon="heart" onPress={() => setRed(true)} />
        </Row>
      </Section>

      <RecentDays date={date} onPick={setDate} />
      <View style={{ height: space.lg }} />

      <PainSheet visible={pain} onClose={() => setPain(false)} date={date} />
      <RedFlagSheet visible={red} onClose={() => setRed(false)} date={date} />
      <Sheet visible={craving} onClose={() => setCraving(false)} title="Craving? 10-minute routine">
        {CRAVING_ROUTINE.map((l, i) => (
          <Card key={i} tone="alt">
            <T v="bodyStrong">
              {i + 1}. {l}
            </T>
          </Card>
        ))}
        <Button label="Done" onPress={() => setCraving(false)} />
      </Sheet>
    </Screen>
  );
}
