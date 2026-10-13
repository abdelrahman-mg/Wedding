import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { DISCLAIMER } from '../data/guides';
import { todayISO } from '../engine/dates';
import { AiKeyCard } from '../features/AiKeyCard';
import { ThemePicker } from '../features/ThemePicker';
import { buildDemoData } from '../services/demo';
import { exportBackup, pickBackup } from '../services/files';
import { disableDemo, enableDemo, REAL_BACKUP_KEY, STORAGE_KEY, useApp } from '../store/useApp';
import { Banner, Button, Card, Screen, SectionTitle, Segmented, T, ToggleRow } from '../ui/kit';

export default function Settings() {
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const s = data.settings;
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = async (label: string, payload: unknown = data) => {
    try {
      await exportBackup(payload as any, label);
      setMsg('Backup ready: save it to Drive, email it to yourself, or keep it in Files.');
    } catch (e: any) {
      setMsg(`Export failed: ${e?.message ?? e}`);
    }
  };

  const doImport = async () => {
    try {
      const imported = await pickBackup();
      if (!imported) return;
      Alert.alert('Replace all data?', 'This replaces everything on this phone with the backup.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => {
            st.replaceData(imported);
            setMsg('Backup restored.');
          },
        },
      ]);
    } catch (e: any) {
      setMsg(`Import failed: ${e?.message ?? e}`);
    }
  };

  const debugExport = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const real = await AsyncStorage.getItem(REAL_BACKUP_KEY);
    await doExport('database-debug', { ...data, __raw: raw ? JSON.parse(raw) : null, __realBackupWhileDemo: real ? JSON.parse(real) : null });
  };

  return (
    <Screen>
      {msg ? <Banner tone="info" text={msg} onPress={() => setMsg(null)} action="Dismiss" /> : null}

      <SectionTitle>Look and feel</SectionTitle>
      <Card>
        <ThemePicker />
        <Segmented label="Body units" value={s.units} onChange={(v) => st.setSettings({ units: v })} options={[{ label: 'kg / cm', value: 'metric' }, { label: 'lb / in', value: 'imperial' }]} />
        <T v="caption" muted>Gym loads always stay in kg.</T>
        <ToggleRow label="Arabic encouragement" sub="Occasional Franco-Arabic phrases on Today" value={s.arabic} onChange={(v) => st.setSettings({ arabic: v })} />
        <ToggleRow label="Reduce motion" sub="Also follows the system setting" value={s.reduceMotion} onChange={(v) => st.setSettings({ reduceMotion: v })} />
      </Card>

      <SectionTitle>Profile</SectionTitle>
      <Card>
        <T>
          Start {data.profile.startDate ?? '–'} · {data.profile.startWeight} kg · waist {data.profile.startWaist} cm · {data.profile.heightCm} cm · age {data.profile.age} · body fat {data.profile.bodyFatEst}% (estimate)
        </T>
      </Card>

      <SectionTitle>Steps source</SectionTitle>
      <Card>
        <ToggleRow label="Read steps from Health Connect" sub="Not bundled in this build. Steps are entered manually; the toggle only shows a reminder." value={s.healthConnect} onChange={(v) => st.setSettings({ healthConnect: v })} />
      </Card>

      <SectionTitle>Doctor clearance</SectionTitle>
      <Card tone={s.doctorCleared ? 'success' : 'warning'}>
        <T>
          Hard limits stay on until a doctor has reviewed your labs and blood pressure: about 1,700 kcal minimum, max 12,000 steps, max 45 min cardio, no HIIT, running or jumping.
        </T>
        <ToggleRow
          label="A doctor reviewed my labs and BP"
          sub={data.checklist.doctor_reviewed?.done ? 'Ticked in Health checks' : 'Tick it in Health checks first'}
          value={s.doctorCleared}
          disabled={!data.checklist.doctor_reviewed?.done && !s.doctorCleared}
          onChange={(v) =>
            v
              ? Alert.alert('Confirm', 'Only confirm if a doctor actually reviewed your lab results and blood pressure and cleared you for more training.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'I confirm', onPress: () => st.setSettings({ doctorCleared: true }) },
                ])
              : st.setSettings({ doctorCleared: false })
          }
        />
      </Card>

      <SectionTitle>Paused exercises</SectionTitle>
      <Card>
        <ToggleRow label="Shoulder exercises paused" sub="Turn off once a doctor or physio has cleared you" value={s.restricted.shoulder} onChange={(v) => st.setSettings({ restricted: { ...s.restricted, shoulder: v } })} />
        <ToggleRow label="Knee / leg exercises paused" sub="Turn off once a doctor or physio has cleared you" value={s.restricted.knee} onChange={(v) => st.setSettings({ restricted: { ...s.restricted, knee: v } })} />
      </Card>

      <SectionTitle>AI coach (optional)</SectionTitle>
      <AiKeyCard />

      <SectionTitle>Backup</SectionTitle>
      <Card>
        <T muted>Your data lives only on this phone. Export a JSON backup regularly and keep it somewhere safe.</T>
        <Button label="Export backup (JSON)" icon="copy" onPress={() => doExport('backup')} />
        <Button label="Import backup" variant="secondary" onPress={doImport} />
        <Button label="Export database (debug)" variant="ghost" small onPress={debugExport} />
      </Card>

      <SectionTitle>Demo mode</SectionTitle>
      <Card tone={s.demoMode ? 'accent' : 'alt'}>
        <T>Loads 4 weeks of fake logs so you can try the charts, the coach and badges. Your real data is set aside and restored exactly when you turn it off.</T>
        <ToggleRow
          label="Demo mode"
          value={s.demoMode}
          onChange={async (v) => {
            if (v) await enableDemo(buildDemoData(todayISO()));
            else await disableDemo();
          }}
        />
        {s.demoMode ? <Banner tone="accent" icon="star" text="Demo data is showing. Anything you log now is discarded when demo mode is turned off." /> : null}
      </Card>

      <SectionTitle>Reset</SectionTitle>
      <Card>
        <Button
          label="Reset plan to original"
          variant="secondary"
          onPress={() =>
            Alert.alert('Reset the plan?', 'Meals, session days and swaps go back to the original. Logs are kept.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset plan', onPress: () => st.resetPlan() },
            ])
          }
        />
        <Button
          label="Reset the whole app"
          variant="danger"
          onPress={() =>
            Alert.alert('Erase everything?', 'All logs, settings and photos references are deleted from this phone. Export a backup first.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase',
                style: 'destructive',
                onPress: async () => {
                  await AsyncStorage.removeItem(REAL_BACKUP_KEY);
                  st.resetAll();
                  router.replace('/onboarding');
                },
              },
            ])
          }
        />
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <T v="bodyStrong">MG Recomp Coach {Constants.expoConfig?.version ?? ''}</T>
        <T muted>Offline-first. No account, no ads, no analytics. Made for MG.</T>
        <T muted>{DISCLAIMER}</T>
        <Button label="Safety and disclaimers" variant="ghost" small onPress={() => router.push('/safety')} />
      </Card>
    </Screen>
  );
}
