import { useMemo } from 'react';
import { View } from 'react-native';
import { BADGES } from '../data/badges';
import { todayISO } from '../engine/dates';
import { streaksAndXp } from '../engine/selectors';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Card, ProgressBar, Row, Screen, T } from '../ui/kit';
import { radius, space, useTheme } from '../ui/theme';

export default function Badges() {
  const { c } = useTheme();
  const data = useApp((s) => s.data);
  const s = useMemo(() => streaksAndXp(data, todayISO()), [data]);
  const earned = Object.keys(data.badges).length;
  return (
    <Screen>
      <Card tone="accent">
        <Row>
          <Icon name="flame" color={c.accent} size={30} />
          <View style={{ flex: 1 }}>
            <T v="title">{s.current}-day streak</T>
            <T muted>Best: {s.best} days. One grace day per 14 days.</T>
          </View>
        </Row>
        <T v="bodyStrong">
          Level {s.level.level} · {s.level.title}
        </T>
        <ProgressBar label="XP" value={s.level.into} max={500} valueText={`${s.level.into} / 500`} color={c.accent} />
        <T v="caption" muted>{s.xp} XP total. Each day’s score adds to your XP.</T>
      </Card>
      <T v="heading">
        Badges · {earned}/{BADGES.length}
      </T>
      <Row wrap gap={space.sm}>
        {BADGES.map((b) => {
          const got = data.badges[b.id];
          return (
            <View
              key={b.id}
              accessible
              accessibilityLabel={`${b.name}. ${got ? `Earned ${got}` : 'Locked'}. ${b.desc}`}
              style={{ flexBasis: '47%', flexGrow: 1, borderRadius: radius.md, padding: space.md, backgroundColor: got ? c.accentSoft : c.surface, borderWidth: 1, borderColor: got ? c.accent : c.border, opacity: got ? 1 : 0.7, gap: 4 }}
            >
              <Icon name={got ? 'trophy' : 'star'} color={got ? c.accent : c.textMuted} size={26} />
              <T v="bodyStrong">{b.name}</T>
              <T v="caption" muted>{b.desc}</T>
              <T v="caption" color={got ? c.text : c.textMuted}>{got ? `Earned ${got}` : 'Locked'}</T>
            </View>
          );
        })}
      </Row>
    </Screen>
  );
}
