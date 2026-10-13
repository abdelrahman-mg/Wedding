import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { todayISO } from '../engine/dates';
import { weekFor } from '../engine/selectors';
import type { Photo } from '../engine/types';
import { deleteLocalFile, savePhotoLocally } from '../services/files';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Chip, Row, Screen, SectionTitle, T } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';

const WEEKS = [1, 4, 8, 12];
const ANGLES: Photo['angle'][] = ['front', 'side', 'back'];

export default function Photos() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const st = useApp.getState();
  const today = todayISO();
  const current = Math.min(12, weekFor(data, today));
  const [angle, setAngle] = useState<Photo['angle']>('front');
  const [err, setErr] = useState<string | null>(null);

  const find = (week: number, a: Photo['angle']) => [...data.photos].reverse().find((p) => p.week === week && p.angle === a);

  const add = async (week: number, a: Photo['angle'], camera: boolean) => {
    try {
      const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErr('Permission denied. You can allow it in Android settings.');
        return;
      }
      const res = camera ? await ImagePicker.launchCameraAsync({ quality: 0.6 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
      if (res.canceled || !res.assets?.[0]) return;
      const uri = savePhotoLocally(res.assets[0].uri);
      const old = find(week, a);
      if (old) {
        deleteLocalFile(old.uri);
        st.removePhoto(old.id);
      }
      st.addPhoto({ uri, angle: a, week, date: today });
    } catch (e: any) {
      setErr(`Could not save the photo: ${e?.message ?? e}`);
    }
  };

  const latestWeek = [...WEEKS].reverse().find((w) => find(w, angle) && w !== 1);
  const first = find(1, angle);
  const last = latestWeek ? find(latestWeek, angle) : undefined;

  return (
    <Screen>
      <T muted>Weeks 1, 4, 8 and 12. Same light, same spot, same clothes. Photos stay in the app’s private folder and are never uploaded.</T>
      {err ? <Banner tone="danger" text={err} onPress={() => setErr(null)} /> : null}
      <SectionTitle>Compare</SectionTitle>
      <Row wrap>
        {ANGLES.map((a) => (
          <Chip key={a} label={a} selected={angle === a} onPress={() => setAngle(a)} />
        ))}
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        {[{ label: 'Week 1', p: first }, { label: latestWeek ? `Week ${latestWeek}` : 'Latest', p: last }].map((x) => (
          <View key={x.label} style={{ flex: 1, gap: 4 }}>
            <T v="label">{x.label}</T>
            {x.p ? (
              <Image source={{ uri: x.p.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: c.surfaceAlt }} accessibilityLabel={`${x.label} ${angle} photo`} />
            ) : (
              <View style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', padding: space.sm }}>
                <T v="caption" muted center>No photo yet</T>
              </View>
            )}
          </View>
        ))}
      </Row>

      {WEEKS.map((w) => (
        <Card key={w} tone={w === current || (w === 1 && current < 4) ? 'alt' : 'default'}>
          <T v="heading">Week {w}</T>
          <Row style={{ alignItems: 'flex-start' }}>
            {ANGLES.map((a) => {
              const p = find(w, a);
              return (
                <Pressable
                  key={a}
                  style={{ flex: 1, gap: 4 }}
                  onPress={() =>
                    Alert.alert(`Week ${w} · ${a}`, 'Add a photo', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Gallery', onPress: () => add(w, a, false) },
                      { text: 'Camera', onPress: () => add(w, a, true) },
                    ])
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Week ${w} ${a} photo${p ? ', replace' : ', add'}`}
                >
                  {p ? (
                    <Image source={{ uri: p.uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.sm }} />
                  ) : (
                    <View style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                      <T v="label" color={c.primary}>+ {a}</T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Row>
        </Card>
      ))}
      <Button label="Take this week’s front photo" icon="camera" variant="secondary" onPress={() => add(WEEKS.reduce((a, w) => (w <= current ? w : a), 1), 'front', true)} />
    </Screen>
  );
}
