// Global overlays: the floating rest-timer pill and short celebrations.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store/useApp';
import { useCelebration } from './celebrate';
import { Icon } from './Icon';
import { Button, Row, T, useReduceMotion } from './kit';
import { radius, space, useTheme } from './theme';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function RestTimerPill() {
  const { c } = useTheme();
  const timer = useApp((s) => s.restTimer);
  const setTimer = useApp((s) => s.setRestTimer);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef<number | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const left = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (timer && left === 0 && buzzed.current !== timer.endsAt) {
      buzzed.current = timer.endsAt;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Vibration.vibrate([0, 300, 150, 300]);
      const t = setTimeout(() => setTimer(null), 4000);
      return () => clearTimeout(t);
    }
  }, [left, timer, setTimer]);

  if (!timer) return null;
  const done = left === 0;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center' }]}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          marginBottom: insets.bottom + 76,
          backgroundColor: done ? c.emerald : c.primaryStrong,
          borderRadius: radius.pill,
          paddingLeft: space.lg,
          paddingRight: space.xs,
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}
      >
        <Icon name="timer" size={20} color="#fff" />
        <T v="bodyStrong" color="#fff">
          {done ? 'Rest done. Next set!' : `Rest ${fmt(left)}`}
        </T>
        {!done ? (
          <Pressable
            onPress={() => setTimer({ ...timer, endsAt: timer.endsAt + 15000 })}
            accessibilityRole="button"
            accessibilityLabel="Add 15 seconds"
            style={{ minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <T v="label" color="#fff">+15s</T>
          </Pressable>
        ) : null}
        <Pressable onPress={() => setTimer(null)} accessibilityRole="button" accessibilityLabel="Dismiss rest timer" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const CONFETTI = ['#F4B443', '#3DC2B3', '#3ED490', '#E8A020', '#7FDCD0'];

export function CelebrationOverlay() {
  const { c } = useTheme();
  const queue = useCelebration((s) => s.queue);
  const pop = useCelebration((s) => s.pop);
  const reduce = useReduceMotion();
  const [anim] = useState(() => new Animated.Value(0));
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduce) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [current, reduce, anim]);

  if (!current) return null;
  return (
    <Modal transparent visible animationType={reduce ? 'none' : 'fade'} onRequestClose={pop}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }} onPress={pop} accessibilityLabel="Close celebration">
        {!reduce &&
          Array.from({ length: 18 }).map((_, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                top: '30%',
                left: `${8 + ((i * 37) % 84)}%`,
                width: 10,
                height: 14,
                borderRadius: 2,
                backgroundColor: CONFETTI[i % CONFETTI.length],
                opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 220 + (i % 5) * 40] }) },
                  { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, ((i % 7) - 3) * 18] }) },
                  { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 280}deg`] }) },
                ],
              }}
            />
          ))}
        <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md, alignItems: 'center', width: '100%' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={current.kind === 'level' ? 'star' : 'trophy'} size={34} color={c.accent} />
          </View>
          <T v="title" center>{current.title}</T>
          <T muted center>{current.text}</T>
          <Row>
            <Button label="Nice" onPress={pop} />
          </Row>
        </View>
      </Pressable>
    </Modal>
  );
}
