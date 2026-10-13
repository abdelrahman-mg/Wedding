import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DISCLAIMER, HEALTH_CHECKLIST } from '../data/guides';
import { addDays, todayISO, weekStart } from '../engine/dates';
import { expectedWeight } from '../engine/targets';
import { REMINDER_LABELS, requestPermission, rescheduleAll } from '../services/notifications';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Banner, Button, Card, Chip, Field, num, Row, Screen, T, ToggleRow } from '../ui/kit';
import { space, useTheme } from '../ui/theme';
import type { ReminderId } from '../engine/types';

const STEPS = 5;

export default function Onboarding() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const [step, setStep] = useState(0);
  const today = todayISO();
  const [f, setF] = useState({
    height: String(data.profile.heightCm),
    weight: String(data.profile.startWeight),
    waist: String(data.profile.startWaist),
    bf: String(data.profile.bodyFatEst),
    age: String(data.profile.age),
    start: today,
  });
  const [notifOk, setNotifOk] = useState<boolean | null>(null);

  const startOptions = [today, addDays(today, 1), addDays(weekStart(today), 7)].filter((v, i, a) => a.indexOf(v) === i);
  const w0 = num(f.weight) ?? 110;

  const finish = async () => {
    st.completeOnboarding(
      {
        heightCm: num(f.height) ?? 175,
        startWeight: w0,
        startWaist: num(f.waist) ?? 115,
        bodyFatEst: num(f.bf) ?? 37,
        age: num(f.age) ?? 26,
      },
      f.start,
    );
    // Start weight and waist become the first entries.
    st.setBody(f.start, { weight: w0, waist: num(f.waist) ?? 115 });
    rescheduleAll(useApp.getState().data);
    router.replace('/');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
        <T v="label" muted>
          Step {step + 1} of {STEPS}
        </T>
        <Row gap={4}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: i <= step ? c.primary : c.track }} />
          ))}
        </Row>
      </Row>

      {step === 0 && (
        <>
          <T v="display">Hey MG.</T>
          <T v="title">12 weeks. One plan. Built around you.</T>
          <T muted>
            Daily meals and workouts, set-by-set logging with automatic progression, weekly check-ins that adjust the plan from your data, and a
            Plan B for anything you can’t get.
          </T>
          <Card tone="alt">
            <Row>
              <Icon name="heart" color={c.primary} />
              <T v="bodyStrong">Private by design</T>
            </Row>
            <T muted>Everything stays on this phone. No account, no ads, no analytics. Back up your data from Settings whenever you like.</T>
          </Card>
          <Banner tone="warning" text={DISCLAIMER} />
        </>
      )}

      {step === 1 && (
        <>
          <T v="title">Your starting point</T>
          <T muted>Edit anything that is off. These numbers set your expected weight band.</T>
          <Row>
            <Field label="Height" value={f.height} onChange={(v) => setF({ ...f, height: v })} suffix="cm" />
            <Field label="Age" value={f.age} onChange={(v) => setF({ ...f, age: v })} keyboard="number-pad" />
          </Row>
          <Row>
            <Field label="Weight" value={f.weight} onChange={(v) => setF({ ...f, weight: v })} suffix="kg" />
            <Field label="Waist" value={f.waist} onChange={(v) => setF({ ...f, waist: v })} suffix="cm" />
          </Row>
          <Field label="Body fat (estimate only)" value={f.bf} onChange={(v) => setF({ ...f, bf: v })} suffix="%" />
          <T v="label">Start date</T>
          <Row wrap>
            {startOptions.map((d) => (
              <Chip key={d} label={d === today ? `Today (${d})` : d} selected={f.start === d} onPress={() => setF({ ...f, start: d })} />
            ))}
          </Row>
        </>
      )}

      {step === 2 && (
        <>
          <T v="title">Health checks</T>
          <T muted>You can do these later. Until a doctor checks your blood pressure, the app keeps workouts moderate.</T>
          {HEALTH_CHECKLIST.filter((h) => h.id !== 'doctor_reviewed' && h.id !== 'kidney_normal').map((h) => (
            <ToggleRow key={h.id} label={h.label} sub={h.group === 'labs' ? 'Blood test' : undefined} value={!!data.checklist[h.id]?.done} onChange={() => st.toggleChecklist(h.id, today)} />
          ))}
          <Card tone="alt">
            <T v="bodyStrong">Ask your doctor for</T>
            <T muted>Blood pressure check, fasting glucose, HbA1c, lipid profile, ALT/AST, creatinine, vitamin D, and a chat about your snoring (sleep study).</T>
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          <T v="title">Reminders</T>
          <T muted>Short nudges at the right time. Toggle any of them now or later in Me &gt; Plan &gt; Reminders.</T>
          {(Object.keys(REMINDER_LABELS) as ReminderId[]).map((id) => (
            <ToggleRow
              key={id}
              label={`${REMINDER_LABELS[id].label}`}
              sub={id === 'water' ? '09:00, 11:30, 14:00, 16:30, 19:00' : data.settings.reminders[id].time}
              value={data.settings.reminders[id].enabled}
              onChange={(v) => st.setReminder(id, { enabled: v })}
            />
          ))}
          <Button
            label={notifOk ? 'Notifications allowed' : 'Allow notifications'}
            icon={notifOk ? 'check' : 'bolt'}
            variant={notifOk ? 'secondary' : 'primary'}
            onPress={async () => setNotifOk(await requestPermission())}
          />
          {notifOk === false ? <Banner tone="info" text="Notifications are off. You can turn them on later in Android settings. The app works without them." /> : null}
        </>
      )}

      {step === 4 && (
        <>
          <T v="title">The 12-week plan</T>
          <Card>
            <T v="bodyStrong">Weeks 1-2 · Foundation</T>
            <T muted>6,000 → 7,500 steps. 2 sets per exercise. Learn the moves.</T>
            <T v="bodyStrong">Weeks 3-6 · Build</T>
            <T muted>8,000 → 10,000 steps. Full sets. Week 6 deload.</T>
            <T v="bodyStrong">Weeks 7-10 · Push</T>
            <T muted>10,000 → 11,000 steps. Cardio up to 45 min.</T>
            <T v="bodyStrong">Weeks 11-12 · Finish</T>
            <T muted>Up to 12,000 steps. Week 12 deload plus strength test.</T>
          </Card>
          <Card tone="alt">
            <T v="bodyStrong">The honest part</T>
            <T muted>
              The safe maximum is about 1% of body weight per week (about 1 kg). Your expected week-12 average is around {expectedWeight(12, w0).toFixed(1)} kg (band ±1.5 kg). That is a
              target, not a promise. Weekly averages count, single weigh-ins don’t.
            </T>
          </Card>
          <Banner tone="warning" text="BP not yet checked by a doctor: keep workouts moderate, no heavy straining or breath-holding." />
          <T muted>Optional: record a baseline strength test in week 1 (Gym tab) so week 12 can show your percent change.</T>
        </>
      )}

      <Row style={{ marginTop: space.md }}>
        {step > 0 ? <Button label="Back" variant="ghost" onPress={() => setStep(step - 1)} flex /> : null}
        {step < STEPS - 1 ? (
          <Button label={step === 2 ? 'Next (can do later)' : 'Next'} onPress={() => setStep(step + 1)} flex />
        ) : (
          <Button label="Start Week 1" icon="bolt" variant="accent" onPress={finish} flex />
        )}
      </Row>
    </Screen>
  );
}
