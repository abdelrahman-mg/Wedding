// The Plan B bottom sheet: swap a meal with a live kcal and protein comparison.
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { INGREDIENT_PLAN_B } from '../data/guides';
import { EMERGENCY_SLOTS, emergencyMeals, getMeal, mealsForSlot, SLOT_INFO, type AnyMeal, type Slot } from '../data/meals';
import type { ISODate, MealLog } from '../engine/types';
import { savePhotoLocally } from '../services/files';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Banner, Button, Card, Field, num, Row, Sheet, T, ToggleRow } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';

interface Candidate {
  key: string;
  name: string;
  desc: string;
  kcal: number;
  protein: number;
  mealId?: string;
  group: 'same' | 'emergency';
}

function Delta({ v, unit, goodWhenLower }: { v: number; unit: string; goodWhenLower?: boolean }) {
  const { c } = useTheme();
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  const good = v === 0 ? true : goodWhenLower ? v < 0 : v > 0;
  return (
    <T v="label" color={v === 0 ? c.textMuted : good ? c.success : c.warning}>
      {sign}
      {Math.abs(Math.round(v))} {unit}
    </T>
  );
}

export function PlanBSheet({
  visible,
  onClose,
  date,
  slot,
  plannedId,
  dayPlannedKcal,
  dayTarget,
  treatsThisWeek,
}: {
  visible: boolean;
  onClose: () => void;
  date: ISODate;
  slot: Slot;
  plannedId: string;
  dayPlannedKcal: number;
  dayTarget: number;
  treatsThisWeek: number;
}) {
  const { c } = useTheme();
  const setMeal = useApp((s) => s.setMeal);
  const incPlanB = useApp((s) => s.incPlanB);
  const planned = getMeal(plannedId) as AnyMeal;
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [custom, setCustom] = useState({ open: false, name: '', kcal: '', protein: '', treat: false, photo: undefined as string | undefined });

  const candidates = useMemo(() => {
    const dist = (m: AnyMeal) => Math.abs(m.kcal - planned.kcal) / 100 + Math.abs(m.protein - planned.protein) / 10;
    const same: Candidate[] = mealsForSlot(slot)
      .filter((m) => m.id !== plannedId)
      .sort((a, b) => dist(a) - dist(b))
      .map((m) => ({ key: m.id, name: `${m.id} · ${m.name}`, desc: m.desc, kcal: m.kcal, protein: m.protein, mealId: m.id, group: 'same' }));
    const emergency: Candidate[] = EMERGENCY_SLOTS.includes(slot)
      ? emergencyMeals()
          .sort((a, b) => dist(a) - dist(b))
          .map((m) => ({ key: m.id, name: `${m.id} · ${m.name}`, desc: m.desc, kcal: m.kcal, protein: m.protein, mealId: m.id, group: 'emergency' }))
      : [];
    return { same, emergency };
  }, [slot, plannedId, planned]);

  const customKcal = num(custom.kcal);
  const customProtein = num(custom.protein);
  const preview: Candidate | null = custom.open
    ? customKcal != null
      ? { key: 'custom', name: custom.name || 'Something else', desc: '', kcal: customKcal, protein: customProtein ?? 0, group: 'same' }
      : null
    : selected;

  const isTreat = (cand: Candidate | null) => (cand?.mealId === 'T') || (custom.open && custom.treat);
  const treatWarning = preview && isTreat(preview) && treatsThisWeek >= 1 && plannedId !== 'T';

  const close = () => {
    setSelected(null);
    setCustom({ open: false, name: '', kcal: '', protein: '', treat: false, photo: undefined });
    setShowTable(false);
    onClose();
  };

  const confirm = () => {
    if (!preview) return;
    let entry: MealLog;
    if (custom.open) {
      entry = { status: 'custom', custom: { name: custom.name || 'Something else', kcal: customKcal ?? 0, protein: customProtein ?? 0, photo: custom.photo, treat: custom.treat } };
    } else {
      entry = { status: 'planB', mealId: preview.mealId };
      incPlanB();
    }
    setMeal(date, slot, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    close();
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      const res = perm.granted
        ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ['images'] });
      if (!res.canceled && res.assets?.[0]) setCustom((c0) => ({ ...c0, photo: savePhotoLocally(res.assets[0].uri) }));
    } catch {
      // camera unavailable: photo is optional
    }
  };

  const renderCand = (cand: Candidate) => {
    const sel = selected?.key === cand.key && !custom.open;
    return (
      <Pressable
        key={cand.key}
        onPress={() => {
          setCustom((x) => ({ ...x, open: false }));
          setSelected(cand);
          Haptics.selectionAsync().catch(() => {});
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: sel }}
        accessibilityLabel={`${cand.name}, ${cand.kcal} kcal, ${cand.protein} grams protein`}
        style={{
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: sel ? c.primary : c.border,
          backgroundColor: sel ? c.surfaceAlt : c.surface,
          padding: space.md,
          gap: 4,
        }}
      >
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <T v="bodyStrong" style={{ flex: 1 }}>
            {cand.name}
          </T>
          {sel ? <Icon name="check" color={c.primary} /> : null}
        </Row>
        <T v="caption" muted>{cand.desc}</T>
        <Row gap={space.md}>
          <T v="label">{cand.kcal} kcal</T>
          <Delta v={cand.kcal - planned.kcal} unit="kcal" goodWhenLower />
          <T v="label">{cand.protein} g P</T>
          <Delta v={cand.protein - planned.protein} unit="g" />
        </Row>
      </Pressable>
    );
  };

  const newDay = preview ? dayPlannedKcal - planned.kcal + preview.kcal : dayPlannedKcal;

  return (
    <Sheet visible={visible} onClose={close} title={`Plan B · ${SLOT_INFO[slot].label}`}>
      <Card tone="alt">
        <T v="caption" muted>PLANNED</T>
        <T v="bodyStrong">{planned.name}</T>
        <T v="label" muted>
          {planned.kcal} kcal · {planned.protein} g protein
        </T>
      </Card>

      {/* Live comparison */}
      <Card tone={preview ? 'success' : 'default'}>
        <T v="caption" muted>LIVE COMPARISON</T>
        {preview ? (
          <>
            <T v="bodyStrong">{preview.name}</T>
            <Row gap={space.lg} wrap>
              <View>
                <T v="caption" muted>Calories</T>
                <Delta v={preview.kcal - planned.kcal} unit="kcal" goodWhenLower />
              </View>
              <View>
                <T v="caption" muted>Protein</T>
                <Delta v={preview.protein - planned.protein} unit="g" />
              </View>
              <View>
                <T v="caption" muted>Day total</T>
                <T v="label">
                  {dayPlannedKcal} → {newDay} kcal
                </T>
              </View>
            </Row>
            <T v="caption" muted>
              Target today: {dayTarget} kcal ({newDay - dayTarget >= 0 ? '+' : ''}
              {newDay - dayTarget} vs target)
            </T>
          </>
        ) : (
          <T muted>Pick an option below to see the difference before you swap.</T>
        )}
      </Card>

      {treatWarning ? <Banner tone="accent" icon="star" text="You already had your treat this week. Keep one treat per week: this is fine to log, just not a habit." /> : null}

      {preview ? <Button label="Use this" icon="swap" onPress={confirm} /> : null}

      <T v="heading">Same slot</T>
      {candidates.same.length ? candidates.same.map(renderCand) : <T muted>Banana missing? Any piece of fruit and a black coffee works the same.</T>}

      {candidates.emergency.length ? (
        <>
          <T v="heading">Emergency / no cooking</T>
          {candidates.emergency.map(renderCand)}
        </>
      ) : null}

      <Pressable onPress={() => setShowTable(!showTable)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="heading">Ingredient missing?</T>
          <Icon name={showTable ? 'up' : 'down'} color={c.text} />
        </Row>
      </Pressable>
      {showTable ? (
        <Card>
          {INGREDIENT_PLAN_B.map((r) => (
            <View key={r.missing} style={{ paddingVertical: 4 }}>
              <T v="bodyStrong">{r.missing}</T>
              <T muted>→ {r.use}</T>
            </View>
          ))}
          <T v="caption" muted>Same palm or cup size. Mark the meal as eaten as planned.</T>
        </Card>
      ) : null}

      <T v="heading">Log something else</T>
      {!custom.open ? (
        <Button label="Log something else" variant="secondary" icon="plus" onPress={() => setCustom({ ...custom, open: true })} />
      ) : (
        <Card>
          <Field label="What was it?" value={custom.name} onChange={(v) => setCustom({ ...custom, name: v })} keyboard="default" placeholder="e.g. Chicken shawarma plate" />
          <Row>
            <Field label="kcal (estimate)" value={custom.kcal} onChange={(v) => setCustom({ ...custom, kcal: v })} keyboard="number-pad" />
            <Field label="Protein (estimate)" value={custom.protein} onChange={(v) => setCustom({ ...custom, protein: v })} keyboard="number-pad" suffix="g" />
          </Row>
          <ToggleRow label="This was a treat meal" value={custom.treat} onChange={(v) => setCustom({ ...custom, treat: v })} />
          <Row>
            <Button label={custom.photo ? 'Retake photo' : 'Add photo (optional)'} small variant="ghost" icon="camera" onPress={pickPhoto} />
            {custom.photo ? <Image source={{ uri: custom.photo }} style={{ width: 48, height: 48, borderRadius: 8 }} accessibilityLabel="Meal photo" /> : null}
          </Row>
          <T v="caption" muted>Rough is fine. A custom meal 300+ kcal over the plan costs 3 points, honesty costs nothing.</T>
        </Card>
      )}
    </Sheet>
  );
}
