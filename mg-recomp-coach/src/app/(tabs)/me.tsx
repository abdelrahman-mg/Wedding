// "Me": how it's going (Progress), what to change (Coach), and the plan and settings (Plan).
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { CoachPanel, useCoachProposals } from '../../features/CoachPanel';
import { FoodPlan } from '../../features/FoodPlan';
import { PlanHub } from '../../features/PlanHub';
import { StatsView } from '../../features/StatsView';
import { Screen, ScreenHeader, Segmented, SectionTitle } from '../../ui/kit';

type MeTab = 'progress' | 'coach' | 'plan';

export default function Me() {
  const params = useLocalSearchParams<{ tab?: string; coach?: string }>();
  const [tab, setTab] = useState<MeTab>((params.tab as MeTab) ?? 'progress');
  const [coachTab, setCoachTab] = useState<'review' | 'ask'>(params.coach === 'ask' ? 'ask' : 'review');
  const [seen, setSeen] = useState(`${params.tab}|${params.coach}`);
  const key = `${params.tab}|${params.coach}`;
  if (key !== seen) {
    setSeen(key);
    if (params.tab) setTab(params.tab as MeTab);
    if (params.coach === 'ask' || params.coach === 'review') setCoachTab(params.coach);
  }
  const { review, pending } = useCoachProposals();

  return (
    <Screen>
      <ScreenHeader title="Me" subtitle={review.headline} planLink={false} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Progress', value: 'progress' },
          { label: `Coach${pending.length ? ` (${pending.length})` : ''}`, value: 'coach' },
          { label: 'Plan', value: 'plan' },
        ]}
      />

      {tab === 'progress' ? <StatsView /> : null}

      {tab === 'coach' ? (
        <>
          <Segmented
            value={coachTab}
            onChange={setCoachTab}
            options={[
              { label: 'Weekly review', value: 'review' },
              { label: 'Ask a question', value: 'ask' },
            ]}
          />
          <CoachPanel tab={coachTab} />
        </>
      ) : null}

      {tab === 'plan' ? (
        <>
          <PlanHub />
          <SectionTitle>Meals</SectionTitle>
          <FoodPlan />
        </>
      ) : null}
    </Screen>
  );
}
