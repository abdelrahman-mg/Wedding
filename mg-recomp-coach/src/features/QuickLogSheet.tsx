import { useState } from 'react';
import type { ISODate } from '../engine/types';
import { useApp } from '../store/useApp';
import { Button, Field, num, Row, Segmented, Sheet, T } from '../ui/kit';
import { useUnits } from '../ui/units';

const SCALE = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }));

export function QuickLogSheet({ visible, onClose, date }: { visible: boolean; onClose: () => void; date: ISODate }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Quick log">
      {visible ? <QuickLogForm date={date} onClose={onClose} /> : null}
    </Sheet>
  );
}

function QuickLogForm({ onClose, date }: { onClose: () => void; date: ISODate }) {
  const log = useApp((s) => s.data.dayLogs[date]);
  const body = useApp((s) => s.data.body[date]);
  const healthConnect = useApp((s) => s.data.settings.healthConnect);
  const st = useApp.getState();
  const u = useUnits();
  const [f, setF] = useState(() => ({
      steps: log?.steps != null ? String(log.steps) : '',
      sleep: log?.sleep != null ? String(log.sleep) : '',
      weight: body?.weight != null ? String(u.w(body.weight)) : '',
      waist: body?.waist != null ? String(u.l(body.waist)) : '',
      note: log?.note ?? '',
      energy: log?.energy ?? 0,
      hunger: log?.hunger ?? 0,
  }));

  const save = () => {
    const steps = num(f.steps);
    const sleep = num(f.sleep);
    st.updateDay(date, {
      steps: steps != null ? Math.round(steps) : undefined,
      sleep: sleep != null ? Math.min(14, sleep) : undefined,
      energy: f.energy || undefined,
      hunger: f.hunger || undefined,
      note: f.note || undefined,
    });
    const w0 = num(f.weight);
    const wa0 = num(f.waist);
    const w = w0 != null ? Math.round(u.toKg(w0) * 10) / 10 : null;
    const wa = wa0 != null ? Math.round(u.toCm(wa0) * 10) / 10 : null;
    st.setBody(date, { weight: w != null && w > 30 && w < 300 ? w : null, waist: wa != null && wa > 40 && wa < 200 ? wa : null });
    onClose();
  };

  return (
    <>
      <Row>
        <Field label="Steps" value={f.steps} onChange={(v) => setF({ ...f, steps: v })} keyboard="number-pad" />
        <Field label="Sleep" value={f.sleep} onChange={(v) => setF({ ...f, sleep: v })} suffix="h" />
      </Row>
      {healthConnect ? <T v="caption" muted>Health Connect is not bundled in this build: enter steps from your phone’s step counter.</T> : null}
      <Row>
        <Field label="Weight (morning)" value={f.weight} onChange={(v) => setF({ ...f, weight: v })} suffix={u.wUnit} />
        <Field label="Waist (weekly)" value={f.waist} onChange={(v) => setF({ ...f, waist: v })} suffix={u.lUnit} />
      </Row>
      <T v="caption" muted>Weigh after the toilet, before breakfast. Waist at the belly button, relaxed, once a week.</T>
      <Segmented label="Energy (1 = drained, 5 = great)" value={f.energy || null} onChange={(v) => setF({ ...f, energy: v })} options={SCALE} />
      <Segmented label="Hunger (1 = full, 5 = starving)" value={f.hunger || null} onChange={(v) => setF({ ...f, hunger: v })} options={SCALE} />
      <Field label="Note" value={f.note} onChange={(v) => setF({ ...f, note: v })} keyboard="default" multiline />
      <Button label="Save" icon="check" onPress={save} />
    </>
  );
}
