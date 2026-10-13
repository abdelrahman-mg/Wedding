// "Something hurt", "Something feels wrong" and blood-pressure sheets.
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { EMERGENCY_NUMBER_EGYPT, KNEE_SAFETY, RED_FLAGS } from '../data/guides';
import { bpStatus, isCrisisBp, isHighBp, painStatus } from '../engine/rules';
import type { ISODate, PainFlag } from '../engine/types';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Chip, Field, num, Row, Segmented, Sheet, T, ToggleRow } from '../ui/kit';

export function PainSheet({ visible, onClose, date, exercise }: { visible: boolean; onClose: () => void; date: ISODate; exercise?: string }) {
  const addPain = useApp((s) => s.addPain);
  const flags = useApp((s) => s.data.painFlags);
  const setSettings = useApp((s) => s.setSettings);
  const restricted = useApp((s) => s.data.settings.restricted);
  const [part, setPart] = useState<PainFlag['bodyPart'] | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const close = () => {
    setPart(null);
    setNote('');
    setSaved(false);
    onClose();
  };

  const status = part === 'shoulder' || part === 'knee' ? painStatus(flags, date).find((p) => p.part === part) : undefined;

  return (
    <Sheet visible={visible} onClose={close} title="Something hurt">
      {!saved ? (
        <>
          {exercise ? <T muted>During: {exercise}</T> : null}
          <Segmented
            label="Where?"
            value={part}
            onChange={setPart}
            options={[
              { label: 'Shoulder', value: 'shoulder' },
              { label: 'Knee', value: 'knee' },
              { label: 'Back', value: 'back' },
              { label: 'Other', value: 'other' },
            ]}
          />
          <Field label="What happened? (optional)" value={note} onChange={setNote} keyboard="default" placeholder="e.g. sharp pain at the bottom of the press" />
          <Button
            label="Log it"
            disabled={!part}
            onPress={() => {
              if (!part) return;
              addPain({ date, bodyPart: part, note: note || undefined, exercise });
              setSaved(true);
            }}
          />
        </>
      ) : (
        <>
          <Card tone="warning">
            <T v="bodyStrong">Stop or modify</T>
            <T>Sharp pain, instability, swelling, or the joint giving way: stop this exercise now.</T>
            <T>Mild discomfort: lower the weight, shorten the range, or use the alternative.</T>
            {part === 'knee' ? <T v="bodyStrong">{KNEE_SAFETY}</T> : null}
          </Card>
          {status?.refer ? (
            <Card tone="danger">
              <T v="bodyStrong">Second {part} flag in 14 days</T>
              <T>See an orthopedist or physio before loading this area again. The app can pause the {part === 'knee' ? 'leg' : 'upper-body'} exercises until you are cleared.</T>
              <ToggleRow
                label={`Pause ${part} exercises until cleared`}
                value={restricted[part as 'shoulder' | 'knee']}
                onChange={(v) => setSettings({ restricted: { ...restricted, [part as 'shoulder' | 'knee']: v } })}
              />
            </Card>
          ) : null}
          <Button label="Done" onPress={close} />
        </>
      )}
    </Sheet>
  );
}

export function RedFlagSheet({ visible, onClose, date }: { visible: boolean; onClose: () => void; date: ISODate }) {
  const addRedFlag = useApp((s) => s.addRedFlag);
  const cancelWorkout = useApp((s) => s.cancelWorkout);
  const active = useApp((s) => s.active);
  const [picked, setPicked] = useState<(typeof RED_FLAGS)[number] | null>(null);
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={close} title="Something feels wrong">
      {!picked ? (
        <>
          <T muted>What are you feeling?</T>
          {RED_FLAGS.map((r) => (
            <Button
              key={r.id}
              label={r.label}
              variant="secondary"
              onPress={() => {
                addRedFlag(date, r.label);
                if (active) cancelWorkout();
                setPicked(r);
              }}
            />
          ))}
        </>
      ) : (
        <>
          <Card tone="danger">
            <T v="title">Stop exercising now.</T>
            <T>Sit or lie down somewhere safe. Do not continue the workout today.</T>
            {picked.emergency ? (
              <T v="bodyStrong">
                Chest pain or fainting can be an emergency. Call an ambulance now: {EMERGENCY_NUMBER_EGYPT} in Egypt. Tell someone near you.
              </T>
            ) : (
              <T>Seek medical care today. If it gets worse, or comes with chest pain or fainting, call {EMERGENCY_NUMBER_EGYPT} (ambulance, Egypt).</T>
            )}
          </Card>
          {picked.emergency ? <Button label={`Call ${EMERGENCY_NUMBER_EGYPT} (ambulance)`} variant="danger" icon="alert" onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER_EGYPT}`)} /> : null}
          <Button label="Close" variant="ghost" onPress={close} />
        </>
      )}
    </Sheet>
  );
}

export function BpSheet({ visible, onClose, date }: { visible: boolean; onClose: () => void; date: ISODate }) {
  const addBp = useApp((s) => s.addBp);
  const entries = useApp((s) => s.data.bp);
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [time, setTime] = useState<'morning' | 'evening'>(new Date().getHours() < 14 ? 'morning' : 'evening');
  const [symptoms, setSymptoms] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [tone, setTone] = useState<'warning' | 'danger' | 'success'>('success');

  const close = () => {
    setSys('');
    setDia('');
    setPulse('');
    setSymptoms(false);
    setResult(null);
    onClose();
  };
  const s = num(sys);
  const d = num(dia);
  return (
    <Sheet visible={visible} onClose={close} title="Blood pressure">
      {!result ? (
        <>
          <T muted>Sit quietly for 5 minutes, arm at heart level, then measure.</T>
          <Row>
            <Field label="Systolic (top)" value={sys} onChange={setSys} keyboard="number-pad" />
            <Field label="Diastolic (bottom)" value={dia} onChange={setDia} keyboard="number-pad" />
          </Row>
          <Field label="Pulse (optional)" value={pulse} onChange={setPulse} keyboard="number-pad" suffix="bpm" />
          <Segmented value={time} onChange={setTime} options={[{ label: 'Morning', value: 'morning' }, { label: 'Evening', value: 'evening' }]} />
          <ToggleRow label="Any symptoms now?" sub="Headache, chest pain, vision changes, dizziness" value={symptoms} onChange={setSymptoms} />
          <Button
            label="Save reading"
            disabled={!s || !d}
            onPress={() => {
              if (!s || !d) return;
              const entry = { date, systolic: s, diastolic: d, pulse: num(pulse) ?? undefined, time, symptoms };
              addBp(entry);
              const st = bpStatus([...entries, { ...entry, id: 'new' }]);
              setTone(isCrisisBp(entry) || (isHighBp(entry) && symptoms) ? 'danger' : isHighBp(entry) ? 'warning' : 'success');
              setResult(st.message);
            }}
          />
        </>
      ) : (
        <>
          <Banner tone={tone === 'success' ? 'success' : tone} text={result} />
          {tone === 'danger' ? <Button label={`Call ${EMERGENCY_NUMBER_EGYPT}`} variant="danger" onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER_EGYPT}`)} /> : null}
          <Button
            label="See BP log"
            variant="ghost"
            onPress={() => {
              close();
              router.push('/health');
            }}
          />
          <Button label="Done" onPress={close} />
        </>
      )}
    </Sheet>
  );
}

export function SafetyButtons({ date, exercise }: { date: ISODate; exercise?: string }) {
  const [pain, setPain] = useState(false);
  const [red, setRed] = useState(false);
  return (
    <>
      <Row wrap>
        <Chip label="Something hurt" icon="alert" onPress={() => setPain(true)} />
        <Chip label="Something feels wrong" icon="heart" onPress={() => setRed(true)} />
      </Row>
      <PainSheet visible={pain} onClose={() => setPain(false)} date={date} exercise={exercise} />
      <RedFlagSheet visible={red} onClose={() => setRed(false)} date={date} />
    </>
  );
}
