import * as Linking from 'expo-linking';
import { DISCLAIMER, EMERGENCY_NUMBER_EGYPT, KNEE_SAFETY, RED_FLAGS } from '../data/guides';
import { HARD_LIMITS } from '../data/phases';
import { Button, Card, Screen, SectionTitle, T } from '../ui/kit';

export default function Safety() {
  return (
    <Screen>
      <Card tone="warning">
        <T v="bodyStrong">{DISCLAIMER}</T>
      </Card>

      <SectionTitle>Stop and seek care for</SectionTitle>
      <Card tone="danger">
        {RED_FLAGS.map((r) => (
          <T key={r.id}>• {r.label}</T>
        ))}
        <T v="bodyStrong">Chest pain or fainting: call an ambulance, {EMERGENCY_NUMBER_EGYPT} in Egypt.</T>
        <Button label={`Call ${EMERGENCY_NUMBER_EGYPT}`} variant="danger" onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER_EGYPT}`)} />
      </Card>

      <SectionTitle>Your joints</SectionTitle>
      <Card>
        <T v="bodyStrong">Right shoulder (4 dislocations)</T>
        <T>No behind-the-neck moves, no dips, no wide-grip or deep-stretch chest flyes, no upright rows. Bench and overhead press are in your program because you chose them: use safety bars or a spotter, keep elbows about 45 degrees, controlled range, and stop if the shoulder feels loose, pinches or slips.</T>
        <T v="bodyStrong">Right knee (ACL repair)</T>
        <T>No jumping, running, pivoting lunges, or heavy end-range leg extensions. Squat and deadlift are in your program because you chose them: build the weight slowly, use safety bars, and keep every range pain-free.</T>
        <T v="bodyStrong">{KNEE_SAFETY}</T>
      </Card>

      <SectionTitle>Hard limits (until a doctor clears you)</SectionTitle>
      <Card>
        <T>• Average intake never below about {HARD_LIMITS.kcalFloor.toLocaleString('en-US')} kcal a day.</T>
        <T>• Daily steps never above {HARD_LIMITS.stepsMax.toLocaleString('en-US')}.</T>
        <T>• Cardio never above {HARD_LIMITS.cardioMax} minutes per session.</T>
        <T>• No HIIT, running or jumping.</T>
        <T>• No diet pills, fat burners, detox or “insulin” supplements.</T>
        <T>• No fasting beyond normal meal gaps, no extreme restriction, no dehydration, laxatives or sweat suits.</T>
      </Card>

      <SectionTitle>About the numbers</SectionTitle>
      <Card>
        <T>Body fat, calories, the expected band and the week-12 projection are estimates, not measurements. The safe maximum loss is about 1% of body weight per week. Results are expected, never promised.</T>
      </Card>
    </Screen>
  );
}
