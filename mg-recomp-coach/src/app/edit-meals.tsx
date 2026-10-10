import { Alert } from 'react-native';
import { getMeal, mealsForSlot, SLOT_INFO, type Slot } from '../data/meals';
import { DAY_NAMES, DAY_SHORT, DAYS } from '../data/plan';
import { plannedTotals } from '../engine/nutrition';
import { useApp } from '../store/useApp';
import { Button, Card, Chip, Row, Screen, SectionTitle, T } from '../ui/kit';

const EDITABLE: Exclude<Slot, 'PG'>[] = ['B', 'M', 'L', 'D', 'N'];

export default function EditMeals() {
  const plan = useApp((s) => s.data.plan);
  const st = useApp.getState();
  return (
    <Screen>
      <T muted>Changes here are permanent for every week. For a one-day swap use Plan B on the Today screen.</T>
      <SectionTitle>Treat lunch day</SectionTitle>
      <T v="caption" muted>One planned treat lunch per week (2 thin-crust pizza slices or 1 savory chicken crepe, with salad).</T>
      <Row wrap>
        {DAYS.map((d) => (
          <Chip key={d} label={DAY_SHORT[d]} selected={plan.treatDay === d} onPress={() => st.moveTreat(d)} />
        ))}
      </Row>
      {DAYS.map((d) => {
        const t = plannedTotals(plan, d);
        return (
          <Card key={d}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="heading">{DAY_NAMES[d]}</T>
              <T v="label" muted>
                {t.kcal.toLocaleString('en-US')} kcal · {t.protein} g
              </T>
            </Row>
            {EDITABLE.map((slot) => {
              const options = mealsForSlot(slot).filter((m) => slot !== 'L' || m.id !== 'T' || plan.treatDay === d);
              return (
                <Card key={slot} tone="alt" style={{ padding: 10 }}>
                  <T v="label">{SLOT_INFO[slot].label}: {getMeal(plan.meals[d][slot] ?? '')?.name ?? '–'}</T>
                  <Row wrap>
                    {options.map((m) => (
                      <Chip key={m.id} label={`${m.id} ${m.name}`} selected={plan.meals[d][slot] === m.id} onPress={() => st.setPlanMeal(d, slot, m.id)} />
                    ))}
                  </Row>
                </Card>
              );
            })}
            {plan.sessionDays[d] ? <T v="caption" muted>+ Pre-gym banana and coffee (gym day)</T> : null}
          </Card>
        );
      })}
      <Button
        label="Reset plan to original"
        variant="danger"
        onPress={() =>
          Alert.alert('Reset the plan?', 'Meals, session days, treat day and exercise swaps go back to the original plan. Your logs are kept.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => st.resetPlan() },
          ])
        }
      />
    </Screen>
  );
}
