import { Platform, useColorScheme } from 'react-native';

const light = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F8',
  border: '#E4E7EF',
  text: '#12151F',
  textMuted: '#5F6678',
  textFaint: '#8A91A3',
  primary: '#5B4BEA',
  primaryPressed: '#4A3BD1',
  primarySoft: '#EEEBFF',
  onPrimary: '#FFFFFF',
  success: '#12805C',
  successSoft: '#E3F6EE',
  warning: '#A55A00',
  warningSoft: '#FFF1DA',
  danger: '#C62F3E',
  dangerSoft: '#FDE8EA',
  info: '#1D5FD6',
  infoSoft: '#E4EEFF',
  overlay: 'rgba(12,14,24,0.5)',
  shadow: '#1B1F3B',
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#0C0E16',
  surface: '#151824',
  surfaceAlt: '#1D2131',
  border: '#272C3F',
  text: '#F1F3FA',
  textMuted: '#A3AABF',
  textFaint: '#7A8198',
  primary: '#8B7FFF',
  primaryPressed: '#9E94FF',
  primarySoft: '#25214A',
  onPrimary: '#0C0E16',
  success: '#43D9A0',
  successSoft: '#123327',
  warning: '#FFB84D',
  warningSoft: '#3A2A10',
  danger: '#FF7A87',
  dangerSoft: '#3D1B21',
  info: '#6EA5FF',
  infoSoft: '#16284A',
  overlay: 'rgba(0,0,0,0.65)',
  shadow: '#000000',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  h1: { fontFamily: font.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  h2: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  stat: { fontFamily: font.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
} as const;

export const BREAKPOINT_WIDE = 900;
export const MAX_CONTENT_WIDTH = 1080;

export function useTheme(): { colors: Colors; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark };
}

export const shadow = (c: Colors, level: 1 | 2 = 1) =>
  Platform.select({
    web: { boxShadow: level === 1 ? `0 1px 2px ${c.shadow}14, 0 1px 3px ${c.shadow}0F` : `0 8px 24px ${c.shadow}22` } as any,
    default: {
      shadowColor: c.shadow,
      shadowOpacity: level === 1 ? 0.07 : 0.16,
      shadowRadius: level === 1 ? 4 : 14,
      shadowOffset: { width: 0, height: level === 1 ? 1 : 6 },
      elevation: level === 1 ? 1 : 6,
    },
  });

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted',
  AWAITING_APPROVAL: 'Needs review',
  APPROVED: 'Generating video',
  VIDEO_COMPLETED: 'Ready to publish',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
};

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function statusTone(s?: string): Tone {
  switch (s) {
    case 'PUBLISHED':
    case 'VIDEO_COMPLETED':
    case 'connected':
      return 'success';
    case 'AWAITING_APPROVAL':
    case 'unconfigured':
      return 'warning';
    case 'FAILED':
    case 'REJECTED':
    case 'error':
      return 'danger';
    case 'SUBMITTED':
    case 'APPROVED':
      return 'info';
    default:
      return 'neutral';
  }
}

export function toneColors(c: Colors, tone: Tone) {
  switch (tone) {
    case 'success': return { fg: c.success, bg: c.successSoft };
    case 'warning': return { fg: c.warning, bg: c.warningSoft };
    case 'danger': return { fg: c.danger, bg: c.dangerSoft };
    case 'info': return { fg: c.info, bg: c.infoSoft };
    default: return { fg: c.textMuted, bg: c.surfaceAlt };
  }
}
