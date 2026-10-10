import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../store/useApp';
import { Icon, type IconName } from './Icon';
import { radius, space, type, useTheme, type TypeVariant } from './theme';

// Text ------------------------------------------------------------------------

export function T({
  v = 'body',
  color,
  muted,
  center,
  style,
  children,
  numberOfLines,
  accessibilityRole,
}: {
  v?: TypeVariant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
}) {
  const { c } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole ?? (v === 'display' || v === 'title' || v === 'heading' ? 'header' : undefined)}
      maxFontSizeMultiplier={1.6}
      style={[type[v], { color: color ?? (muted ? c.textMuted : c.text) }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}

// Layout ----------------------------------------------------------------------

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const { c } = useTheme();
  const inner = padded ? { padding: space.lg, paddingBottom: 120, gap: space.md } : undefined;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Row({ children, gap = space.sm, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Card({ children, style, tone, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'alt' | 'accent' | 'warning' | 'danger' | 'success'; onPress?: () => void; accessibilityLabel?: string }) {
  const { c } = useTheme();
  const bg =
    tone === 'alt' ? c.surfaceAlt : tone === 'accent' ? c.accentSoft : tone === 'warning' ? c.warningSoft : tone === 'danger' ? c.dangerSoft : tone === 'success' ? c.successSoft : c.surface;
  const s = [{ backgroundColor: bg, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: tone && tone !== 'default' ? 'transparent' : c.border, gap: space.sm }, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={s}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <T v="heading">{children}</T>
      {right}
    </Row>
  );
}

// Buttons -----------------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  small,
  disabled,
  style,
  accessibilityLabel,
  flex,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  icon?: IconName;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  flex?: boolean;
}) {
  const { c } = useTheme();
  const bg = variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : variant === 'accent' ? c.accent : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? '#fff' : variant === 'accent' ? c.onAccent : c.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          minHeight: small ? 40 : 50,
          paddingHorizontal: small ? space.md : space.lg,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: c.border,
        },
        flex && { flex: 1 },
        style,
      ]}
      hitSlop={small ? 6 : 0}
    >
      {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={[small ? type.label : type.bodyStrong, { color: fg, textAlign: 'center' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, color, size = 22 }: { name: IconName; onPress: () => void; label: string; color?: string; size?: number }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name={name} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primary : c.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? c.onPrimary : c.primary} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={[type.label, { color: selected ? c.onPrimary : c.text }]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

// Progress ----------------------------------------------------------------------

export function ProgressBar({ value, max, label, valueText, color }: { value: number; max: number; label?: string; valueText?: string; color?: string }) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100), text: valueText }} style={{ gap: 4 }}>
      {label || valueText ? (
        <Row style={{ justifyContent: 'space-between' }}>
          {label ? <T v="label">{label}</T> : <View />}
          {valueText ? <T v="label" muted>{valueText}</T> : null}
        </Row>
      ) : null}
      <View style={{ height: 10, backgroundColor: c.track, borderRadius: 5, overflow: 'hidden' }}>
        <View style={{ height: 10, width: `${pct * 100}%`, backgroundColor: color ?? (pct >= 1 ? c.emerald : c.primary), borderRadius: 5 }} />
      </View>
    </View>
  );
}

export function Ring({ size = 64, stroke = 8, pct, color, children, label }: { size?: number; stroke?: number; pct: number; color?: string; children?: ReactNode; label?: string }) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View accessible accessibilityLabel={label} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      {children}
    </View>
  );
}

// Sheet -------------------------------------------------------------------------

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
          <View
            style={{
              backgroundColor: c.bg,
              borderTopLeftRadius: radius.lg + 8,
              borderTopRightRadius: radius.lg + 8,
              maxHeight: '90%',
              paddingBottom: insets.bottom + space.md,
            }}
            accessibilityViewIsModal
          >
            <View style={{ alignItems: 'center', paddingTop: space.sm }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.border }} />
            </View>
            <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.xs }}>
              <T v="title" style={{ flex: 1 }}>
                {title}
              </T>
              <IconButton name="close" onPress={onClose} label="Close" />
            </Row>
            <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Inputs ------------------------------------------------------------------------

export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard = 'decimal-pad',
  suffix,
  multiline,
  secure,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  keyboard?: 'decimal-pad' | 'number-pad' | 'default';
  suffix?: string;
  multiline?: boolean;
  secure?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <T v="label">{label}</T>
      <Row style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 50 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          keyboardType={keyboard}
          multiline={multiline}
          secureTextEntry={secure}
          autoCapitalize={keyboard === 'default' ? 'sentences' : 'none'}
          accessibilityLabel={label}
          style={[type.body, { color: c.text, flex: 1, paddingVertical: space.sm, minHeight: multiline ? 70 : undefined, textAlignVertical: multiline ? 'top' : 'center' }]}
        />
        {suffix ? <T muted>{suffix}</T> : null}
      </Row>
    </View>
  );
}

export function Segmented<V extends string | number>({ options, value, onChange, label }: { options: { label: string; value: V }[]; value: V | null | undefined; onChange: (v: V) => void; label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {label ? <T v="label">{label}</T> : null}
      <Row gap={6} wrap>
        {options.map((o) => {
          const sel = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${label ? label + ': ' : ''}${o.label}`}
              style={{
                minWidth: 48,
                minHeight: 44,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: sel ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: sel ? c.primary : c.border,
              }}
            >
              <Text maxFontSizeMultiplier={1.4} style={[type.label, { color: sel ? c.onPrimary : c.text }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 48 }}>
      <View style={{ flex: 1, paddingRight: space.md }}>
        <T v="bodyStrong">{label}</T>
        {sub ? <T v="caption" muted>{sub}</T> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: c.primary, false: c.track }}
        thumbColor={Platform.OS === 'android' ? (value ? c.primaryStrong : '#f4f4f4') : undefined}
      />
    </Row>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, label, format }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; label: string; format?: (n: number) => string }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T v="bodyStrong" style={{ flex: 1 }}>{label}</T>
      <Row gap={4} style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.pill }}>
        <IconButton name="minus" label={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - step))} color={c.primary} />
        <T v="bodyStrong" style={{ minWidth: 56, textAlign: 'center' }}>{format ? format(value) : String(value)}</T>
        <IconButton name="plus" label={`Increase ${label}`} onPress={() => onChange(Math.min(max, value + step))} color={c.primary} />
      </Row>
    </Row>
  );
}

export function Banner({ tone = 'warning', text, icon = 'alert', onPress, action }: { tone?: 'warning' | 'danger' | 'info' | 'success' | 'accent'; text: string; icon?: IconName; onPress?: () => void; action?: string }) {
  const { c } = useTheme();
  const map = {
    warning: [c.warningSoft, c.warning],
    danger: [c.dangerSoft, c.danger],
    info: [c.surfaceAlt, c.primary],
    success: [c.successSoft, c.success],
    accent: [c.accentSoft, c.onAccent],
  } as const;
  const [bg, fg] = map[tone];
  const content = (
    <Row style={{ backgroundColor: bg, padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' }}>
      <Icon name={icon} size={20} color={tone === 'accent' ? c.accent : fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" color={tone === 'accent' ? c.text : fg}>{text}</T>
        {action ? <T v="caption" color={tone === 'accent' ? c.text : fg} style={{ textDecorationLine: 'underline' }}>{action}</T> : null}
      </View>
    </Row>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: space.xs }} />;
}

export function Empty({ title, text, action, onPress }: { title: string; text: string; action?: string; onPress?: () => void }) {
  return (
    <Card tone="alt" style={{ alignItems: 'center', paddingVertical: space.xl }}>
      <T v="heading" center>{title}</T>
      <T muted center>{text}</T>
      {action && onPress ? <Button label={action} onPress={onPress} small /> : null}
    </Card>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: c.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: c.border, gap: 2 }}>
      <T v="caption" muted>{label}</T>
      <T v="number">{value}</T>
      {sub ? <T v="caption" muted>{sub}</T> : null}
    </View>
  );
}

export function useReduceMotion(): boolean {
  const pref = useApp((s) => s.data.settings.reduceMotion);
  const [sys, setSys] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSys).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSys);
    return () => sub.remove();
  }, []);
  return pref || sys;
}

export const num = (s: string): number | null => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
