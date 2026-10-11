// Pick a color scheme (and light/dark). Applies instantly.
import { Pressable, View } from 'react-native';
import { useApp } from '../store/useApp';
import { Icon } from '../ui/Icon';
import { Row, Segmented, T } from '../ui/kit';
import { radius, space, THEMES, useTheme } from '../ui/theme';

export function ThemePicker() {
  const { c, mode, theme } = useTheme();
  const themePref = useApp((s) => s.data.settings.theme);
  const setSettings = useApp((s) => s.setSettings);
  return (
    <View style={{ gap: space.md }}>
      <Segmented
        label="Appearance"
        value={themePref}
        onChange={(v) => setSettings({ theme: v })}
        options={[
          { label: 'Follow phone', value: 'system' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ]}
      />
      <T v="label">Color scheme</T>
      <View style={{ gap: space.sm }}>
        {THEMES.map((t) => {
          const p = mode === 'dark' ? t.dark : t.light;
          const sel = t.id === theme.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setSettings({ palette: t.id })}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${t.name}. ${t.blurb}`}
              style={({ pressed }) => ({
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: sel ? c.primary : c.border,
                backgroundColor: c.surface,
                padding: space.md,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Row>
                {/* Mini preview: background, card, primary button and accent. */}
                <View style={{ width: 84, height: 56, borderRadius: radius.sm, backgroundColor: p.bg, padding: 6, gap: 4, borderWidth: 1, borderColor: p.border }}>
                  <View style={{ flex: 1, borderRadius: 6, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 4, justifyContent: 'center' }}>
                    <View style={{ height: 4, width: '70%', borderRadius: 2, backgroundColor: p.text, opacity: 0.8 }} />
                  </View>
                  <Row gap={4}>
                    <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: p.primary }} />
                    <View style={{ width: 14, height: 10, borderRadius: 5, backgroundColor: p.accent }} />
                  </Row>
                </View>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{t.name}</T>
                  <T v="caption" muted>{t.blurb}</T>
                </View>
                {sel ? <Icon name="check" color={c.primary} size={24} strokeWidth={3} /> : null}
              </Row>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
