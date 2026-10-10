import { MEAL_PREP, MEAL_PREP_STORAGE } from '../data/guides';
import { Card, Screen, T } from '../ui/kit';

export default function Prep() {
  return (
    <Screen>
      <T muted>Two prep sessions cover the whole week. Reminders: Friday 09:00 and Tuesday 18:00.</T>
      {MEAL_PREP.map((p) => (
        <Card key={p.id}>
          <T v="heading">{p.title}</T>
          {p.steps.map((s) => (
            <T key={s}>• {s}</T>
          ))}
        </Card>
      ))}
      <Card tone="alt">
        <T v="bodyStrong">Storage</T>
        <T>{MEAL_PREP_STORAGE}</T>
      </Card>
    </Screen>
  );
}
