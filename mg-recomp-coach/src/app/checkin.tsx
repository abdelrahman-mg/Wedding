// End-of-day "check on me" flow.
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { getMeal, SLOT_INFO } from '../data/meals';
import { FINISH_MESSAGES } from '../data/messages';
import { SESSIONS } from '../data/sessions';
import { addDays, todayISO } from '../engine/dates';
import { proteinFix } from '../engine/nutrition';
import { dayContext, daySummary } from '../engine/selectors';
import { PainSheet } from '../features/SafetySheets';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Chip, ProgressBar, Ring, Row, Screen, Segmented, T } from '../ui/kit';
import { useTheme } from '../ui/theme';

export default function Checkin() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? todayISO();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const sum = useMemo(() => daySummary(data, date), [data, date]);
  const log = data.dayLogs[date];
  const tomorrow = dayContext(data, addDays(date, 1));
  const firstMeal = tomorrow.slots[0] ? getMeal(tomorrow.slots[0].mealId) : undefined;
  const [hurt, setHurt] = useState(false);
  const [painAnswer, setPainAnswer] = useState<'no' | 'yes' | null>(null);

  const missed: string[] = [];
  for (const s of sum.ctx.slots) if (!log?.meals[s.slot] || log.meals[s.slot]?.status === 'skipped') missed.push(SLOT_INFO[s.slot].label);
  if (sum.ctx.isGym && !sum.workout) missed.push('Workout');
  if (!sum.ctx.isGym && (log?.cardioMinutes ?? 0) < sum.ctx.cardioTarget) missed.push('Cardio');
  if ((log?.steps ?? 0) < sum.ctx.stepTarget) missed.push('Steps');
  if ((log?.water ?? 0) < 10) missed.push('Water');

  const gap = sum.ctx.proteinTarget - sum.protein;
  const line = sum.score.total >= 70 ? FINISH_MESSAGES[0] : 'New day, same plan. Tomorrow starts with one good meal.';

  return (
    <Screen>
      <Row>
        <Ring size={96} stroke={10} pct={sum.score.total / 100} color={sum.score.total >= 70 ? c.emerald : c.primary} label={`Day score ${sum.score.total}`}>
          <T v="number">{sum.score.total}</T>
        </Ring>
        <T v="title" style={{ flex: 1 }}>
          {sum.score.total >= 70 ? 'Streak day. Well done.' : 'Logged. That counts.'}
        </T>
      </Row>
      <Card>
        <ProgressBar label="Meals" value={sum.score.meals} max={40} valueText={`${sum.score.meals}/40`} />
        <ProgressBar label="Training" value={sum.score.training} max={25} valueText={`${sum.score.training}/25`} />
        <ProgressBar label="Steps" value={sum.score.steps} max={15} valueText={`${sum.score.steps}/15`} />
        <ProgressBar label="Water" value={sum.score.water} max={10} valueText={`${sum.score.water}/10`} />
        <ProgressBar label="Protein" value={sum.score.protein} max={10} valueText={`${sum.score.protein}/10`} />
        {sum.score.bonus ? <T v="caption" muted>Bonus +{sum.score.bonus} (sleep / weigh-in)</T> : null}
      </Card>

      {missed.length ? <Banner tone="info" text={`Open items: ${missed.join(', ')}.`} /> : <Banner tone="success" icon="check" text="Everything ticked off." />}
      <Card tone="alt">
        <T v="bodyStrong">Protein</T>
        <T>{proteinFix(gap)}</T>
      </Card>

      <T v="heading">Quick questions</T>
      {sum.ctx.isGym && !sum.workout ? (
        <Card>
          <T v="bodyStrong">Did you do the workout?</T>
          <Row wrap>
            <Chip label="Yes, open Train to log it" onPress={() => router.push('/train')} />
            <Chip label="Walked instead" onPress={() => st.logWalk(date)} />
            <Chip label="No" onPress={() => st.updateDay(date, { sessionOverride: 'skip' })} />
          </Row>
        </Card>
      ) : null}
      <Card>
        <Segmented label="How was your energy? (1-5)" value={log?.energy ?? null} onChange={(v) => st.updateDay(date, { energy: v })} options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))} />
      </Card>
      <Card>
        <T v="bodyStrong">Anything hurt?</T>
        <Row>
          <Chip label="No" selected={painAnswer === 'no'} onPress={() => setPainAnswer('no')} />
          <Chip
            label="Yes"
            selected={painAnswer === 'yes'}
            onPress={() => {
              setPainAnswer('yes');
              setHurt(true);
            }}
          />
        </Row>
      </Card>

      <Card tone="accent">
        <T v="bodyStrong">Tomorrow</T>
        <T>
          {tomorrow.session ? `Gym: ${SESSIONS[tomorrow.session].name} (minimum version is fine on a bad day).` : `Rest + ${tomorrow.cardioTarget} min easy cardio.`}
        </T>
        {firstMeal ? <T>First meal: {firstMeal.name} at 08:00.</T> : null}
        <T muted>Lights off by 23:30.</T>
      </Card>
      <T v="bodyStrong" center>{line}</T>
      <Button
        label="Done"
        icon="check"
        onPress={() => {
          st.updateDay(date, { checkinDone: true });
          router.back();
        }}
      />
      <PainSheet visible={hurt} onClose={() => setHurt(false)} date={date} />
    </Screen>
  );
}
