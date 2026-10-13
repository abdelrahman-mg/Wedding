import { useEffect, useState } from 'react';
import type { ReminderId } from '../engine/types';
import { hasPermission, REMINDER_LABELS, requestPermission } from '../services/notifications';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Field, Row, Screen, SectionTitle, T, ToggleRow } from '../ui/kit';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function ReminderRow({ id }: { id: ReminderId }) {
  const r = useApp((s) => s.data.settings.reminders[id]);
  const setReminder = useApp((s) => s.setReminder);
  const [time, setTime] = useState(r.time);
  const valid = TIME_RE.test(time);
  return (
    <Card>
      <ToggleRow label={REMINDER_LABELS[id].label} sub={REMINDER_LABELS[id].channel} value={r.enabled} onChange={(v) => setReminder(id, { enabled: v })} />
      {id !== 'water' && r.enabled ? (
        <Row>
          <Field label="Time (HH:MM)" value={time} onChange={setTime} keyboard="default" />
          <Button label="Save" small disabled={!valid || time === r.time} onPress={() => setReminder(id, { time })} style={{ alignSelf: 'flex-end' }} />
        </Row>
      ) : null}
      {!valid ? <T v="caption" muted>Use 24-hour time like 07:30.</T> : null}
    </Card>
  );
}

export default function Reminders() {
  const snooze = useApp((s) => s.data.settings.snoozeUntil);
  const setSettings = useApp((s) => s.setSettings);
  const [perm, setPerm] = useState<boolean | null>(null);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    hasPermission().then(setPerm);
  }, []);
  const snoozed = snooze != null && snooze > now;
  return (
    <Screen>
      {perm === false ? (
        <Banner tone="warning" text="Notifications are not allowed. Tap to allow them." onPress={async () => setPerm(await requestPermission())} />
      ) : null}
      <Card tone={snoozed ? 'warning' : 'alt'}>
        <T v="bodyStrong">{snoozed ? `All reminders snoozed until ${new Date(snooze as number).toLocaleString()}` : 'Need a quiet day?'}</T>
        {snoozed ? (
          <Button label="Resume reminders now" small onPress={() => setSettings({ snoozeUntil: null })} />
        ) : (
          <Button label="Snooze all for 24 hours" small variant="secondary" onPress={() => setSettings({ snoozeUntil: Date.now() + 24 * 3600 * 1000 })} />
        )}
      </Card>
      <T v="caption" muted>Reminders are scheduled for the next 14 days with that day’s planned meal, and refreshed every time you open the app or change the plan. Grouped by channel: meals, training, check-ins, sleep.</T>
      <SectionTitle>Reminders</SectionTitle>
      {(Object.keys(REMINDER_LABELS) as ReminderId[]).map((id) => (
        <ReminderRow key={id} id={id} />
      ))}
    </Screen>
  );
}
