// Design tokens: one place for colors, spacing, radii and type, in light and dark.
import { useColorScheme } from 'react-native';
import { useApp } from '../store/useApp';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryStrong: string;
  onPrimary: string;
  emerald: string;
  accent: string; // amber: streaks and achievements
  onAccent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  track: string;
  chartBand: string;
  overlay: string;
}

export const light: Palette = {
  bg: '#F3F7F6',
  surface: '#FFFFFF',
  surfaceAlt: '#E6F0EE',
  border: '#D3E0DD',
  text: '#0D2827',
  textMuted: '#4A6361',
  primary: '#0B6B6B',
  primaryStrong: '#064F4F',
  onPrimary: '#FFFFFF',
  emerald: '#0F8A5F',
  accent: '#E8A020',
  onAccent: '#2B1A00',
  accentSoft: '#FDF0D5',
  danger: '#B42318',
  dangerSoft: '#FDE7E4',
  warning: '#8A5A00',
  warningSoft: '#FFF3CF',
  success: '#0F7A55',
  successSoft: '#DDF4EA',
  track: '#DCE7E4',
  chartBand: 'rgba(15,138,95,0.14)',
  overlay: 'rgba(4,20,19,0.45)',
};

export const dark: Palette = {
  bg: '#051514',
  surface: '#0B2220',
  surfaceAlt: '#11302D',
  border: '#1C3D3A',
  text: '#E4F1EE',
  textMuted: '#99B3AE',
  primary: '#3DC2B3',
  primaryStrong: '#7FDCD0',
  onPrimary: '#032120',
  emerald: '#3ED490',
  accent: '#F4B443',
  onAccent: '#2B1A00',
  accentSoft: '#3A2C10',
  danger: '#FF8A7A',
  dangerSoft: '#3D1712',
  warning: '#F4C870',
  warningSoft: '#33290F',
  success: '#5EDBA5',
  successSoft: '#103326',
  track: '#183533',
  chartBand: 'rgba(62,212,144,0.16)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const type = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  number: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
};

export type TypeVariant = keyof typeof type;

export function useTheme() {
  const system = useColorScheme();
  const pref = useApp((s) => s.data.settings.theme);
  const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return { c: mode === 'dark' ? dark : light, mode: mode as 'light' | 'dark' };
}
