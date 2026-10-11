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

// Fixed meaning colors (done, warning, danger) stay the same in every theme.
const SEMANTIC_LIGHT = {
  emerald: '#0F8A5F',
  danger: '#B42318',
  dangerSoft: '#FDE7E4',
  warning: '#8A5A00',
  warningSoft: '#FFF3CF',
  success: '#0F7A55',
  successSoft: '#DDF4EA',
  onAccent: '#2B1A00',
  overlay: 'rgba(4,20,19,0.45)',
};
const SEMANTIC_DARK = {
  emerald: '#3ED490',
  danger: '#FF8A7A',
  dangerSoft: '#3D1712',
  warning: '#F4C870',
  warningSoft: '#33290F',
  success: '#5EDBA5',
  successSoft: '#103326',
  onAccent: '#2B1A00',
  overlay: 'rgba(0,0,0,0.6)',
};

type Base = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryStrong: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  track: string;
  chartBand: string;
};

const L = (b: Base): Palette => ({ ...SEMANTIC_LIGHT, ...b });
const D = (b: Base): Palette => ({ ...SEMANTIC_DARK, ...b });

export interface Theme {
  id: string;
  name: string;
  blurb: string;
  light: Palette;
  dark: Palette;
}

export const THEMES: Theme[] = [
  {
    id: 'nile',
    name: 'Nile teal',
    blurb: 'Calm teal and amber (the original)',
    light: L({ bg: '#F3F7F6', surface: '#FFFFFF', surfaceAlt: '#E6F0EE', border: '#D3E0DD', text: '#0D2827', textMuted: '#4A6361', primary: '#0B6B6B', primaryStrong: '#064F4F', onPrimary: '#FFFFFF', accent: '#E8A020', accentSoft: '#FDF0D5', track: '#DCE7E4', chartBand: 'rgba(15,138,95,0.14)' }),
    dark: D({ bg: '#051514', surface: '#0B2220', surfaceAlt: '#11302D', border: '#1C3D3A', text: '#E4F1EE', textMuted: '#99B3AE', primary: '#3DC2B3', primaryStrong: '#7FDCD0', onPrimary: '#032120', accent: '#F4B443', accentSoft: '#3A2C10', track: '#183533', chartBand: 'rgba(62,212,144,0.16)' }),
  },
  {
    id: 'ocean',
    name: 'Ocean blue',
    blurb: 'Clean, bright and cool',
    light: L({ bg: '#F2F6FC', surface: '#FFFFFF', surfaceAlt: '#E3ECF8', border: '#D0DCEC', text: '#0C1B33', textMuted: '#4B5E7A', primary: '#1D5FD0', primaryStrong: '#12408F', onPrimary: '#FFFFFF', accent: '#F59E0B', accentSoft: '#FEF1D6', track: '#DAE4F2', chartBand: 'rgba(29,95,208,0.13)' }),
    dark: D({ bg: '#08101F', surface: '#0F1B30', surfaceAlt: '#162642', border: '#223656', text: '#E6EEFB', textMuted: '#9AABC8', primary: '#6AA9FF', primaryStrong: '#A5CBFF', onPrimary: '#06142B', accent: '#FBBF24', accentSoft: '#3A2D0E', track: '#1B2D4A', chartBand: 'rgba(106,169,255,0.16)' }),
  },
  {
    id: 'graphite',
    name: 'Graphite',
    blurb: 'Black, white and grey. Minimal.',
    light: L({ bg: '#F5F5F6', surface: '#FFFFFF', surfaceAlt: '#EAEBED', border: '#D9DBDF', text: '#14161A', textMuted: '#5B606A', primary: '#1F2937', primaryStrong: '#0B1220', onPrimary: '#FFFFFF', accent: '#E8590C', accentSoft: '#FDE8DC', track: '#E0E2E6', chartBand: 'rgba(31,41,55,0.10)' }),
    dark: D({ bg: '#0B0C0E', surface: '#15171B', surfaceAlt: '#1E2127', border: '#2A2E36', text: '#F1F2F4', textMuted: '#9AA0AB', primary: '#E5E7EB', primaryStrong: '#FFFFFF', onPrimary: '#111318', accent: '#FF8A4C', accentSoft: '#3A1F10', track: '#23262D', chartBand: 'rgba(229,231,235,0.12)' }),
  },
  {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Warm orange and cream',
    light: L({ bg: '#FBF6F1', surface: '#FFFFFF', surfaceAlt: '#F5E9DE', border: '#EBD9C8', text: '#2A150A', textMuted: '#79584A', primary: '#CC4B15', primaryStrong: '#932F08', onPrimary: '#FFFFFF', accent: '#0E7490', accentSoft: '#D9F0F5', track: '#EFDFD0', chartBand: 'rgba(204,75,21,0.12)' }),
    dark: D({ bg: '#150C07', surface: '#21140D', surfaceAlt: '#2E1C12', border: '#42291A', text: '#FBEEE4', textMuted: '#C0A593', primary: '#FF8A57', primaryStrong: '#FFB48E', onPrimary: '#2A0F02', accent: '#4CC9E0', accentSoft: '#0F2F36', track: '#3A2418', chartBand: 'rgba(255,138,87,0.15)' }),
  },
  {
    id: 'plum',
    name: 'Plum',
    blurb: 'Deep purple with a gold accent',
    light: L({ bg: '#F8F4FC', surface: '#FFFFFF', surfaceAlt: '#EDE4F7', border: '#DDD0EE', text: '#1F0F33', textMuted: '#62507A', primary: '#7A3FB8', primaryStrong: '#52267F', onPrimary: '#FFFFFF', accent: '#D99A00', accentSoft: '#FBEFC9', track: '#E5DAF2', chartBand: 'rgba(122,63,184,0.12)' }),
    dark: D({ bg: '#110A1A', surface: '#1B1229', surfaceAlt: '#26193A', border: '#382852', text: '#F2EAFB', textMuted: '#B3A2CC', primary: '#C79BFF', primaryStrong: '#E0C6FF', onPrimary: '#1D0C33', accent: '#F2C14E', accentSoft: '#3A2D0C', track: '#2F2147', chartBand: 'rgba(199,155,255,0.15)' }),
  },
  {
    id: 'forest',
    name: 'Forest',
    blurb: 'Natural green and earth',
    light: L({ bg: '#F4F7F0', surface: '#FFFFFF', surfaceAlt: '#E7EEDF', border: '#D6E0CA', text: '#14230F', textMuted: '#55694B', primary: '#2F6B2A', primaryStrong: '#1D4719', onPrimary: '#FFFFFF', accent: '#C2760A', accentSoft: '#FBEBD0', track: '#DDE6D2', chartBand: 'rgba(47,107,42,0.13)' }),
    dark: D({ bg: '#0A110A', surface: '#121C11', surfaceAlt: '#1B2A19', border: '#2A3E27', text: '#E8F2E4', textMuted: '#9DB297', primary: '#7FD36F', primaryStrong: '#B2E8A6', onPrimary: '#0B1F08', accent: '#F0A944', accentSoft: '#38280E', track: '#213220', chartBand: 'rgba(127,211,111,0.15)' }),
  },
];

export const DEFAULT_THEME_ID = 'nile';

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Kept for code that wants the original palettes directly.
export const light = THEMES[0].light;
export const dark = THEMES[0].dark;

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
  const paletteId = useApp((s) => s.data.settings.palette);
  const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const theme = getTheme(paletteId);
  return { c: mode === 'dark' ? theme.dark : theme.light, mode: mode as 'light' | 'dark', theme };
}
