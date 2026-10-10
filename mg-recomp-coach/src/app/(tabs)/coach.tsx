import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COACH_SCRIPTS, type ChipAction, type CoachScript } from '../../data/coachScripts';
import { EATING_OUT_RULES } from '../../data/guides';
import { addDays, todayISO, weekStart } from '../../engine/dates';
import { validateChange } from '../../engine/limits';
import { weeklyReport } from '../../engine/report';
import { bpStatus, deloadProposal, painStatus, type Proposal } from '../../engine/rules';
import { earlyDeload, runReview, weekFor } from '../../engine/selectors';
import { isTriggeredDeload } from '../../engine/phase';
import { askCoach, getApiKey, parseChange } from '../../services/aiCoach';
import { useApp } from '../../store/useApp';
import { limitCtxFor } from '../../features/limitCtx';
import { PainSheet } from '../../features/SafetySheets';
import { Banner, Button, Card, Chip, Field, Row, Screen, SectionTitle, Sheet, T } from '../../ui/kit';
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
  const [hasKey, setHasKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiProposal, setAiProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, [data.settings.aiEnabled]);

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
        st.addChat('coach', 'I’m the offline coach, so I answer with the quick-action chips above. For a deeper review, copy your weekly report and paste it into a Claude chat, or add your own API key in Settings.');
      }
    }
  };

  const m = review.metrics;

  return (
    <Screen>
      <T v="display">Coach</T>
      {data.settings.demoMode ? <Banner tone="accent" icon="star" text="DEMO MODE: the coach is reading fake data." /> : null}

      {/* What the data says */}
      <Card>
        <T v="caption" muted>WHAT THE DATA SAYS · WEEK {Math.min(12, week)}</T>
        <T v="title">{review.headline}</T>
        {review.messages.map((msg, i) => (
          <T key={i}>{msg}</T>
        ))}
        {m.latestAvg != null ? (
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: 2 }}>
            <T v="label">Last week average: {m.latestAvg} kg (band {m.bandLow}–{m.bandHigh}, expected {m.expected})</T>
            <T v="label">Rate: {m.ratePerWeek != null ? `${m.ratePerWeek.toFixed(2)} kg/week` : '–'} · distance from expected: {m.distanceFromBand != null ? `${m.distanceFromBand > 0 ? '+' : ''}${m.distanceFromBand} kg` : '–'}</T>
            <T v="label">Week-12 projection (estimate): {m.projectedWeek12 ?? '–'} kg</T>
          </View>
        ) : null}
        <T v="caption" muted>Reviews run every Sunday 20:00 and whenever you open this tab. Changes are proposed from week 3. Safe maximum: about 1 kg per week.</T>
      </Card>

      {/* Proposals */}
      {visible.map((p) => (
        <ProposalCard key={p.id} p={p} error={errors[p.id]} onApply={() => apply(p)} onLater={() => st.dismiss(p.id, today)} />
      ))}
      {data.planChanges.some((p) => !p.undone) ? <Button label="Undo the most recent change" variant="ghost" small onPress={() => st.undoLastChange()} /> : null}

      {/* Safety cards */}
      {pains.map((p) => (
        <Card key={p.part} tone="danger">
          <T v="heading">{p.part === 'knee' ? 'Knee' : 'Shoulder'}: {p.count} pain flags in 14 days</T>
          <T>See an orthopedist or physio before loading this area again. The app can hide those exercises until you are cleared.</T>
          <Button
            label={data.settings.restricted[p.part] ? 'Exercises paused (unpause in Settings)' : `Pause ${p.part} exercises`}
            variant="secondary"
            onPress={() => st.setSettings({ restricted: { ...data.settings.restricted, [p.part]: true } })}
          />
        </Card>
      ))}
      {bp.level === 'urgent' || bp.level === 'doctorSoon' ? <Banner tone={bp.level === 'urgent' ? 'danger' : 'warning'} text={bp.message} onPress={() => router.push('/health')} /> : null}
      {!data.checklist.doctor_bp?.done || !data.checklist.lab_hba1c?.done ? (
        <Card tone="warning" onPress={() => router.push('/health')} accessibilityLabel="Open health checks">
          <T v="heading">Doctor and labs</T>
          <T>Ask for: BP check, fasting glucose, HbA1c, lipid profile, ALT/AST, creatinine, vitamin D. Tick them off in Health checks.</T>
        </Card>
      ) : null}
      {!data.seenCards.snoring && !data.checklist.snoring_discussed?.done ? (
        <Card tone="alt">
          <T v="heading">About the snoring</T>
          <T>Heavy snoring can mean sleep apnea, which raises blood pressure and makes fat loss harder. Ask your doctor whether a sleep study makes sense.</T>
          <Row>
            <Button label="Discussed" small onPress={() => st.toggleChecklist('snoring_discussed', today)} flex />
            <Button label="Dismiss" small variant="ghost" onPress={() => st.markSeen('snoring')} flex />
          </Row>
        </Card>
      ) : null}

      {/* Ask the coach */}
      <SectionTitle>Ask the coach</SectionTitle>
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
      <Field label={data.settings.aiEnabled && hasKey ? 'Ask (AI coach: sends a 14-day summary)' : 'Ask (offline)'} value={q} onChange={setQ} keyboard="default" placeholder="e.g. I’m exhausted today" />
      {aiProposal && !data.dismissed[aiProposal.id] ? (
        <ProposalCard
          p={aiProposal}
          error={errors[aiProposal.id]}
          onApply={() => {
            apply(aiProposal);
          }}
          onLater={() => {
            st.dismiss(aiProposal.id, today);
            setAiProposal(null);
          }}
        />
      ) : null}
      {busy ? <ActivityIndicator color={c.primary} /> : <Button label="Send" onPress={send} disabled={!q.trim()} />}
      <T v="caption" muted>
        {data.settings.aiEnabled && hasKey
          ? 'AI coach is on: your question and a compact 14-day summary are sent to Anthropic only when you press Send. Suggested changes still go through the Apply cards and the hard limits.'
          : 'Offline: nothing leaves your phone. Optional AI coach in Plan > Settings (your own API key).'}
      </T>
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
