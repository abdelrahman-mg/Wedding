import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COACH_SCRIPTS, type ChipAction, type CoachScript } from '../../data/coachScripts';
import { EATING_OUT_RULES } from '../../data/guides';
import { addDays, todayISO, weekStart } from '../../engine/dates';
import { validateChange } from '../../engine/limits';
import { weeklyReport } from '../../engine/report';
import { bpStatus, deloadProposal, painStatus, type Proposal } from '../../engine/rules';
import { earlyDeload, runReview, weekFor } from '../../engine/selectors';
import { isTriggeredDeload } from '../../engine/phase';
import { askCoach, parseChange } from '../../services/aiCoach';
import { AiKeyCard, useHasApiKey } from '../../features/AiKeyCard';
import { useApp } from '../../store/useApp';
import { limitCtxFor } from '../../features/limitCtx';
import { PainSheet } from '../../features/SafetySheets';
import { AlertStack, Banner, Button, Card, Chip, Field, Row, Screen, ScreenHeader, Segmented, Sheet, T, type AlertItem } from '../../ui/kit';
import { radius, space, useTheme } from '../../ui/theme';

function ProposalCard({ p, onApply, onLater, error }: { p: Proposal; onApply: () => void; onLater: () => void; error?: string }) {
  return (
    <Card tone="alt">
      <T v="caption" muted>PROPOSED CHANGE</T>
      <T v="heading">{p.title}</T>
      <T>{p.reason}</T>
      <T v="bodyStrong">{p.change}</T>
      {error ? <Banner tone="danger" text={error} /> : null}
      <Row>
        <Button label="Apply" icon="check" onPress={onApply} flex />
        <Button label="Not now" variant="ghost" onPress={onLater} flex />
      </Row>
    </Card>
  );
}

export default function Coach() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const today = todayISO();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [script, setScript] = useState<CoachScript | null>(null);
  const [eatOut, setEatOut] = useState(false);
  const [pain, setPain] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useHasApiKey();
  const [copied, setCopied] = useState(false);
  const [aiProposal, setAiProposal] = useState<Proposal | null>(null);

  const [tab, setTab] = useState<'review' | 'ask'>('review');

  const review = useMemo(() => runReview(data, today), [data, today]);
  const deload = useMemo(() => earlyDeload(data, today), [data, today]);
  const week = weekFor(data, today);
  const pains = painStatus(data.painFlags, today).filter((p) => p.refer);
  const bp = bpStatus(data.bp);

  const proposals: Proposal[] = [...review.proposals];
  if (deload.trigger && !isTriggeredDeload(today, data.adjust.deloadUntil)) proposals.push(deloadProposal(today, deload.reasons, data.adjust.kcalAdjust));
  const visible = proposals.filter((p) => !data.dismissed[p.id]);

  const apply = (p: Proposal) => {
    const ctx = limitCtxFor(data, today);
    for (const a of p.apply) {
      const r = validateChange(a.type, a.value, ctx);
      if (!r.ok) {
        setErrors({ ...errors, [p.id]: r.reason ?? 'Outside the hard limits.' });
        return;
      }
    }
    st.applyProposal(p, today);
  };

  const runAction = (a: ChipAction) => {
    setScript(null);
    switch (a) {
      case 'minimum':
      case 'walk':
      case 'equipment':
        router.push('/train');
        break;
      case 'band':
        router.push('/progress');
        break;
      case 'pain':
        setPain(true);
        break;
      case 'eatingOut':
        setEatOut(true);
        break;
      default:
        break;
    }
  };

  const offlineAnswer = (text: string): CoachScript | null => {
    const t = text.toLowerCase();
    if (/busy|machine|equipment|taken/.test(t)) return COACH_SCRIPTS[0];
    if (/tired|exhaust|lazy|no energy|sleepy/.test(t)) return COACH_SCRIPTS[1];
    if (/ate out|restaurant|delivery|pizza|crepe|party|wedding|ate too/.test(t)) return COACH_SCRIPTS[2];
    if (/stuck|plateau|not moving|scale|weight/.test(t)) return COACH_SCRIPTS[3];
    if (/missed|skipped|fell off|days off/.test(t)) return COACH_SCRIPTS[4];
    if (/hurt|pain|shoulder|knee|injur/.test(t)) return COACH_SCRIPTS[5];
    return null;
  };

  const send = async () => {
    const text = q.trim();
    if (!text) return;
    st.addChat('user', text);
    setQ('');
    if (data.settings.aiEnabled && hasKey) {
      setBusy(true);
      try {
        const reply = await askCoach(useApp.getState().data, today, text);
        const parsed = parseChange(reply, today);
        st.addChat('coach', parsed.text);
        setAiProposal(parsed.proposal);
      } catch (e: any) {
        st.addChat('coach', `${e?.message ?? 'Something went wrong.'}\n\nOffline tip: try a quick-action chip, or copy your weekly report.`);
      } finally {
        setBusy(false);
      }
    } else {
      const s = offlineAnswer(text);
      if (s) {
        st.addChat('coach', `${s.title}\n• ${s.lines.join('\n• ')}`);
      } else {
        st.addChat('coach', 'I’m the offline coach, so I can only answer the quick topics above. Connect the AI coach below to ask anything, or copy your weekly report into a Claude chat.');
      }
    }
  };

  const m = review.metrics;
  const aiOn = data.settings.aiEnabled && !!hasKey;

  const health: AlertItem[] = [];
  if (data.settings.demoMode) health.push({ key: 'demo', tone: 'accent', icon: 'star', text: 'Demo mode: the coach is reading fake data.' });
  for (const p of pains) {
    health.push({
      key: `pain-${p.part}`,
      tone: 'danger',
      text: `${p.part === 'knee' ? 'Knee' : 'Shoulder'}: ${p.count} pain flags in 14 days. See an orthopedist or physio before loading it again.${data.settings.restricted[p.part] ? ' Exercises paused.' : ' Tap to pause those exercises.'}`,
      onPress: () => st.setSettings({ restricted: { ...data.settings.restricted, [p.part]: true } }),
    });
  }
  if (bp.level === 'urgent' || bp.level === 'doctorSoon') health.push({ key: 'bp', tone: bp.level === 'urgent' ? 'danger' : 'warning', text: bp.message, onPress: () => router.push('/health') });
  if (!data.checklist.doctor_bp?.done || !data.checklist.lab_hba1c?.done)
    health.push({ key: 'labs', tone: 'warning', icon: 'heart', text: 'Doctor and labs: BP check, fasting glucose, HbA1c, lipids, ALT/AST, creatinine, vitamin D.', onPress: () => router.push('/health') });

  return (
    <Screen>
      <ScreenHeader title="Coach" subtitle={`Week ${Math.min(12, week)} · ${review.headline}`} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { label: `Weekly review${visible.length ? ` (${visible.length})` : ''}`, value: 'review' },
          { label: 'Ask the coach', value: 'ask' },
        ]}
      />

      {tab === 'review' ? (
        <>
          <Card>
            <T v="caption" muted>WHAT THE DATA SAYS</T>
            <T v="title">{review.headline}</T>
            {review.messages.map((msg, i) => (
              <T key={i}>{msg}</T>
            ))}
            {m.latestAvg != null ? (
              <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: 2 }}>
                <T v="label">Last week: {m.latestAvg} kg · band {m.bandLow}–{m.bandHigh}</T>
                <T v="label">Rate: {m.ratePerWeek != null ? `${m.ratePerWeek.toFixed(2)} kg/week` : '–'} · vs expected: {m.distanceFromBand != null ? `${m.distanceFromBand > 0 ? '+' : ''}${m.distanceFromBand} kg` : '–'}</T>
                <T v="label">Week 12 (estimate): {m.projectedWeek12 ?? '–'} kg</T>
              </View>
            ) : null}
            <T v="caption" muted>Updates every Sunday 20:00 and when you open this tab. Changes are proposed from week 3. Safe maximum: about 1 kg a week.</T>
          </Card>

          {visible.map((p) => (
            <ProposalCard key={p.id} p={p} error={errors[p.id]} onApply={() => apply(p)} onLater={() => st.dismiss(p.id, today)} />
          ))}
          {data.planChanges.some((p) => !p.undone) ? <Button label="Undo the most recent change" variant="ghost" small onPress={() => st.undoLastChange()} /> : null}

          <AlertStack items={health} />
          {!data.seenCards.snoring && !data.checklist.snoring_discussed?.done ? (
            <Card tone="alt">
              <T v="bodyStrong">About the snoring</T>
              <T>Heavy snoring can mean sleep apnea, which raises blood pressure and makes fat loss harder. Ask your doctor whether a sleep study makes sense.</T>
              <Row>
                <Button label="Discussed" small onPress={() => st.toggleChecklist('snoring_discussed', today)} flex />
                <Button label="Dismiss" small variant="ghost" onPress={() => st.markSeen('snoring')} flex />
              </Row>
            </Card>
          ) : null}

          <Button
            label={copied ? 'Copied!' : 'Copy weekly report'}
            icon={copied ? 'check' : 'copy'}
            variant="secondary"
            onPress={async () => {
              await Clipboard.setStringAsync(weeklyReport(data, addDays(weekStart(today), -7)));
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
          />
        </>
      ) : (
        <>
          <T v="label" muted>Quick topics (work offline)</T>
          <Row wrap>
            {COACH_SCRIPTS.map((s) => (
              <Chip key={s.id} label={s.chip} onPress={() => setScript(s)} />
            ))}
          </Row>

          {data.coachChat.length ? (
            <Card>
              {data.coachChat.slice(-10).map((m2, i) => (
                <View
                  key={i}
                  style={{
                    alignSelf: m2.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: m2.role === 'user' ? c.primary : c.surfaceAlt,
                    borderRadius: radius.md,
                    padding: space.md,
                    maxWidth: '88%',
                  }}
                >
                  <T color={m2.role === 'user' ? c.onPrimary : c.text}>{m2.text}</T>
                </View>
              ))}
              <Button label="Clear chat" small variant="ghost" onPress={() => st.clearChat()} />
            </Card>
          ) : null}

          {aiProposal && !data.dismissed[aiProposal.id] ? (
            <ProposalCard
              p={aiProposal}
              error={errors[aiProposal.id]}
              onApply={() => apply(aiProposal)}
              onLater={() => {
                st.dismiss(aiProposal.id, today);
                setAiProposal(null);
              }}
            />
          ) : null}

          <Field
            label={aiOn ? 'Your question (AI coach)' : 'Your question (offline)'}
            value={q}
            onChange={setQ}
            keyboard="default"
            multiline
            placeholder="e.g. Can I swap the oats bowl for granola?"
          />
          {busy ? <ActivityIndicator color={c.primary} /> : <Button label="Send" icon="right" onPress={send} disabled={!q.trim()} />}
          <T v="caption" muted>
            {aiOn
              ? 'Sends your question and a short 14-day summary to Anthropic. Suggested plan changes still need your Apply and stay inside the safety limits.'
              : 'Offline: nothing leaves your phone.'}
          </T>

          <AiKeyCard onChange={(v) => setHasKey(v)} />
        </>
      )}

      <Sheet visible={!!script} onClose={() => setScript(null)} title={script?.title ?? ''}>
        {script?.lines.map((l, i) => (
          <Card key={i} tone="alt">
            <T>{l}</T>
          </Card>
        ))}
        {script?.actions.map((a) => (
          <Button key={a.label} label={a.label} onPress={() => runAction(a.action)} />
        ))}
      </Sheet>
      <Sheet visible={eatOut} onClose={() => setEatOut(false)} title="Eating-out rules">
        {EATING_OUT_RULES.map((r) => (
          <Card key={r} tone="alt">
            <T>{r}</T>
          </Card>
        ))}
      </Sheet>
      <PainSheet visible={pain} onClose={() => setPain(false)} date={today} />
    </Screen>
  );
}
