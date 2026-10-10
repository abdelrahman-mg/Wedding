import { useState } from 'react';
import { HEALTH_CHECKLIST } from '../data/guides';
import { todayISO } from '../engine/dates';
import { bpStatus, isHighBp } from '../engine/rules';
import { BpSheet } from '../features/SafetySheets';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Row, Screen, SectionTitle, T, ToggleRow } from '../ui/kit';
import { useTheme } from '../ui/theme';

export default function Health() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const [bp, setBp] = useState(false);
  const today = todayISO();
  const status = bpStatus(data.bp);
  const groups: { id: 'doctor' | 'labs' | 'other'; title: string }[] = [
    { id: 'doctor', title: 'Doctor' },
    { id: 'labs', title: 'Blood tests' },
    { id: 'other', title: 'At home' },
  ];
  return (
    <Screen>
      {!data.checklist.doctor_bp?.done ? <Banner tone="warning" text="BP not yet checked by a doctor: keep workouts moderate, no heavy straining or breath-holding." /> : null}

      {groups.map((g) => (
        <Card key={g.id}>
          <T v="heading">{g.title}</T>
          {HEALTH_CHECKLIST.filter((h) => h.group === g.id).map((h) => {
            const item = data.checklist[h.id];
            return (
              <ToggleRow key={h.id} label={h.label} sub={item?.done && item.date ? `Done ${item.date}` : undefined} value={!!item?.done} onChange={() => st.toggleChecklist(h.id, today)} />
            );
          })}
        </Card>
      ))}
      <T v="caption" muted>“Kidney labs done and normal” unlocks the creatine card. “Doctor reviewed my labs and BP” lets you confirm clearance in Settings.</T>

      <SectionTitle right={<Button label="Add reading" small icon="plus" onPress={() => setBp(true)} />}>Blood pressure</SectionTitle>
      <Banner tone={status.level === 'urgent' ? 'danger' : status.level === 'doctorSoon' || status.level === 'elevated' ? 'warning' : 'info'} text={status.message} />
      {[...data.bp]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((b) => (
          <Card key={b.id} style={{ paddingVertical: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyStrong" color={isHighBp(b) ? c.warning : c.text}>
                {b.systolic}/{b.diastolic}
                {b.pulse ? ` · pulse ${b.pulse}` : ''}
                {isHighBp(b) ? ' (high)' : ''}
              </T>
              <T v="caption" muted>
                {b.date} {b.time}
              </T>
            </Row>
            <Button label="Delete" small variant="ghost" onPress={() => st.removeBp(b.id)} />
          </Card>
        ))}
      <BpSheet visible={bp} onClose={() => setBp(false)} date={today} />
    </Screen>
  );
}
