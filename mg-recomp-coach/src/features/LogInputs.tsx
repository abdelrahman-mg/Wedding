// "Submit anything, anytime": every input has its own Submit, and a timeline shows what was logged.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { CRAVING_ROUTINE } from '../data/guides';
import { CARDIO_TYPES } from '../data/sessions';
import { bpStatus } from '../engine/rules';
import { dayContext } from '../engine/selectors';
import type { EntryKind, ISODate } from '../engine/types';
import { PainSheet, RedFlagSheet } from './SafetySheets';
import { useApp } from '../store/useApp';
import { Icon, type IconName } from '../ui/Icon';
import { Button, Card, Chip, Field, IconButton, num, Row, Segmented, Sheet, T, ToggleRow } from '../ui/kit';
import { space, useTheme } from '../ui/theme';
import { useUnits } from '../ui/units';

const SCALE = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }));

const KIND_ICON: Record<EntryKind, IconName> = {
  weight: 'scale',
  waist: 'scale',
  steps: 'walk',
  sleep: 'moon',
  energy: 'bolt',
  hunger: 'bolt',
  water: 'drop',
  cardio: 'walk',
  bp: 'heart',
  note: 'plan',
  food: 'plus',
};

/** One input row: a field (or custom control) and a Submit button. */
function QuickInput({
  icon,
  title,
  current,
  children,
  onSubmit,
  disabled,
  submitLabel = 'Submit',
}: {
  icon: IconName;
  title: string;
  current?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <Card style={{ paddingVertical: space.md }}>
      <Row>
        <Icon name={icon} color={c.primary} size={20} />
        <T v="bodyStrong" style={{ flex: 1 }}>{title}</T>
        {current ? <T v="caption" muted>{current}</T> : null}
      </Row>
      {children}
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button label={submitLabel} small icon="check" onPress={onSubmit} disabled={disabled} style={{ minWidth: 120 }} />
      </Row>
    </Card>
  );
}

/** Daily inputs, each with its own Submit. The less frequent ones sit behind a "More" toggle. */
export function Inputs({ date, onDone }: { date: ISODate; onDone: (msg: string) => void }) {
  const [more, setMore] = useState(false);
  const { c } = useTheme();
  const u = useUnits();
  const data = useApp((s) => s.data);
  const submit = useApp((s) => s.submit);
  const log = data.dayLogs[date];
  const body = data.body[date];
  const ctx = useMemo(() => dayContext(data, date), [data, date]);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [cardio, setCardio] = useState('');
  const [cardioType, setCardioType] = useState<string>(CARDIO_TYPES[0]);
  const [energy, setEnergy] = useState<number | null>(null);
  const [hunger, setHunger] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [bp, setBp] = useState({ sys: '', dia: '', pulse: '', symptoms: false });

  const done = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onDone(msg);
  };

  const w = num(weight);
  const wa = num(waist);
  const st = num(steps);
  const sl = num(sleep);
  const cm = num(cardio);
  const sys = num(bp.sys);
  const dia = num(bp.dia);

  return (
    <>
      <QuickInput
        icon="scale"
        title="Weight"
        current={body?.weight != null ? `now ${u.fw(body.weight)}` : 'after the toilet, before breakfast'}
        disabled={w == null || u.toKg(w) < 30 || u.toKg(w) > 300}
        onSubmit={() => {
          submit(date, 'weight', Math.round(u.toKg(w as number) * 10) / 10);
          setWeight('');
          done('Weight saved.');
        }}
      >
        <Field label={`Weight (${u.wUnit})`} value={weight} onChange={setWeight} suffix={u.wUnit} />
      </QuickInput>


      <QuickInput
        icon="walk"
        title="Steps today"
        current={`${(log?.steps ?? 0).toLocaleString('en-US')} / ${ctx.stepTarget.toLocaleString('en-US')}`}
        disabled={st == null || st < 0}
        onSubmit={() => {
          submit(date, 'steps', Math.round(st as number));
          setSteps('');
          done('Steps saved.');
        }}
      >
        <Field label="Total from your phone’s step counter" value={steps} onChange={setSteps} keyboard="number-pad" />
      </QuickInput>


      <QuickInput
        icon="moon"
        title="Sleep last night"
        current={log?.sleep != null ? `${log.sleep} h logged` : 'goal 7+ hours'}
        disabled={sl == null || sl < 0 || sl > 14}
        onSubmit={() => {
          submit(date, 'sleep', sl);
          setSleep('');
          done('Sleep saved.');
        }}
      >
        <Field label="Hours" value={sleep} onChange={setSleep} suffix="h" />
      </QuickInput>


      <QuickInput
        icon="bolt"
        title="Energy and hunger"
        current={log?.energy != null || log?.hunger != null ? `now ${log?.energy ?? '–'} / ${log?.hunger ?? '–'}` : undefined}
        disabled={energy == null && hunger == null}
        onSubmit={() => {
          if (energy != null) submit(date, 'energy', energy);
          if (hunger != null) submit(date, 'hunger', hunger);
          setEnergy(null);
          setHunger(null);
          done('Saved.');
        }}
      >
        <Segmented label="Energy (1 drained, 5 great)" value={energy} onChange={setEnergy} options={SCALE} />
        <Segmented label="Hunger (1 full, 5 starving)" value={hunger} onChange={setHunger} options={SCALE} />
      </QuickInput>


      <Pressable onPress={() => setMore(!more)} accessibilityRole="button" accessibilityLabel={more ? 'Hide more inputs' : 'Show more inputs'} style={{ minHeight: 48, justifyContent: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyStrong" color={c.primary}>{more ? 'Fewer inputs' : 'More: cardio, waist, blood pressure, note'}</T>
          <Icon name={more ? 'up' : 'down'} color={c.primary} />
        </Row>
      </Pressable>
      {more ? (
        <>
      <QuickInput
        icon="walk"
        title="Cardio"
        current={`${log?.cardioMinutes ?? 0}${ctx.isGym ? '' : ` / ${ctx.cardioTarget}`} min today`}
        disabled={cm == null || cm <= 0 || cm > 180}
        submitLabel="Add"
        onSubmit={() => {
          submit(date, 'cardio', Math.round(cm as number), { cardioType });
          setCardio('');
          done('Cardio added.');
        }}
      >
        <Field label="Minutes" value={cardio} onChange={setCardio} keyboard="number-pad" suffix="min" />
        <Row wrap gap={6} style={{ marginTop: 6 }}>
          {CARDIO_TYPES.map((t) => (
            <Chip key={t} label={t} selected={cardioType === t} onPress={() => setCardioType(t)} />
          ))}
        </Row>
      </QuickInput>


      <QuickInput
        icon="scale"
        title="Waist (weekly)"
        current={body?.waist != null ? `now ${u.fl(body.waist)}` : 'at the belly button, relaxed'}
        disabled={wa == null || u.toCm(wa) < 40 || u.toCm(wa) > 200}
        onSubmit={() => {
          submit(date, 'waist', Math.round(u.toCm(wa as number) * 10) / 10);
          setWaist('');
          done('Waist saved.');
        }}
      >
        <Field label={`Waist (${u.lUnit})`} value={waist} onChange={setWaist} suffix={u.lUnit} />
      </QuickInput>


      <QuickInput
        icon="heart"
        title="Blood pressure"
        current={data.bp.length ? bpStatus(data.bp).level.replace('doctorSoon', 'see a doctor soon') : 'sit 5 min first'}
        disabled={!sys || !dia}
        submitLabel="Add"
        onSubmit={() => {
          submit(date, 'bp', sys, { bp: { systolic: sys as number, diastolic: dia as number, pulse: num(bp.pulse) ?? undefined, time: new Date().getHours() < 14 ? 'morning' : 'evening', symptoms: bp.symptoms } });
          setBp({ sys: '', dia: '', pulse: '', symptoms: false });
          done(bpStatus(useApp.getState().data.bp).message);
        }}
      >
        <Row>
          <Field label="Top" value={bp.sys} onChange={(v) => setBp({ ...bp, sys: v })} keyboard="number-pad" />
          <Field label="Bottom" value={bp.dia} onChange={(v) => setBp({ ...bp, dia: v })} keyboard="number-pad" />
          <Field label="Pulse" value={bp.pulse} onChange={(v) => setBp({ ...bp, pulse: v })} keyboard="number-pad" />
        </Row>
        <ToggleRow label="Symptoms right now?" sub="Headache, chest pain, vision changes" value={bp.symptoms} onChange={(v) => setBp({ ...bp, symptoms: v })} />
      </QuickInput>


      <QuickInput
        icon="plan"
        title="Note"
        disabled={!note.trim()}
        submitLabel="Add"
        onSubmit={() => {
          submit(date, 'note', null, { text: note.trim() });
          setNote('');
          done('Note added.');
        }}
      >
        <Field label="Anything worth remembering" value={note} onChange={setNote} keyboard="default" multiline placeholder="e.g. wedding dinner, knee felt great" />
      </QuickInput>
        </>
      ) : null}
    </>
  );
}

/** Everything submitted for a day, newest first, with undo. Shows the last 3 until expanded. */
export function Timeline({ date }: { date: ISODate }) {
  const [all, setAll] = useState(false);
  const { c } = useTheme();
  const entries = useApp((s) => s.data.entries);
  const removeEntry = useApp((s) => s.removeEntry);
  const list = entries.filter((e) => e.date === date).sort((a, b) => b.time - a.time);
  if (!list.length) return <T muted>Nothing submitted yet. Everything you submit shows up here, and you can undo it.</T>;
  const shown = all ? list : list.slice(0, 3);
  return (
    <Card style={{ gap: 0, paddingVertical: space.xs }}>
      {shown.map((e, i) => (
        <Row key={e.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border, minHeight: 48 }}>
          <Icon name={KIND_ICON[e.kind]} color={c.primary} size={18} />
          <T v="caption" muted style={{ width: 46 }}>{new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</T>
          <T style={{ flex: 1 }}>{e.text}</T>
          <IconButton name="close" label={`Undo: ${e.text}`} onPress={() => removeEntry(e.id)} color={c.textMuted} size={18} />
        </Row>
      ))}
      {list.length > 3 ? <Button label={all ? 'Show less' : `Show all ${list.length}`} small variant="ghost" onPress={() => setAll(!all)} /> : null}
    </Card>
  );
}

/** Shortcuts for the moments that don't fit a form: a craving, pain, feeling unwell. */
export function MomentButtons({ date }: { date: ISODate }) {
  const [pain, setPain] = useState(false);
  const [red, setRed] = useState(false);
  const [craving, setCraving] = useState(false);
  const updateDay = useApp((s) => s.updateDay);
  const cravings = useApp((s) => s.data.dayLogs[date]?.cravings ?? 0);
  return (
    <>
      <Row wrap>
        <Button label={`Craving${cravings ? ` (${cravings})` : ''}`} icon="bolt" small variant="secondary" onPress={() => { updateDay(date, { cravings: cravings + 1 }); setCraving(true); }} />
        <Button label="Something hurt" icon="alert" small variant="secondary" onPress={() => setPain(true)} />
        <Button label="Feel unwell" icon="heart" small variant="secondary" onPress={() => setRed(true)} />
      </Row>
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
    </>
  );
}
