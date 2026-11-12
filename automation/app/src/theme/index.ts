import { Platform, useColorScheme } from 'react-native';

/**
 * GrowthOS Design System — Cinematic Dark Interface
 * Primary Palette:
 * - Background: #090A0C
 * - Sidebar: #0C0E11
 * - Primary Panel (Surface): #111317
 * - Secondary Panel (SurfaceAlt): #15181D
 * - Primary Accent (Cinematic Orange): #FF5A1F
 * - Accent Hover: #FF7845
 * - Primary Text: #F3F4F5
 * - Secondary Text: #9299A3
 * - Borders: #252930
 * - Success: #70D6A1
 * - Warning: #F2C36B
 * - Error: #FF7777
 */

const dark = {
  bg: '#090A0C',
  sidebar: '#0C0E11',
  surface: '#111317',
  surfaceAlt: '#15181D',
  border: '#252930',
  borderLight: '#323742',
  text: '#F3F4F5',
  textMuted: '#9299A3',
  textFaint: '#606773',
  primary: '#FF5A1F',
  primaryPressed: '#FF7845',
  primarySoft: '#2B140B',
  onPrimary: '#FFFFFF',
  success: '#70D6A1',
  successSoft: '#122D20',
  warning: '#F2C36B',
  warningSoft: '#332711',
  danger: '#FF7777',
  dangerSoft: '#381616',
  info: '#4EA8DE',
  infoSoft: '#112536',
  overlay: 'rgba(0, 0, 0, 0.75)',
  shadow: '#000000',
};

// GrowthOS defaults to Cinematic Dark mode
const light = { ...dark };

export type Colors = typeof dark;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const;

export const font = {
  regular: Platform.select({ web: "Inter, -apple-system, sans-serif", default: "System" }),
  medium: Platform.select({ web: "Inter, -apple-system, sans-serif", default: "System" }),
  semibold: Platform.select({ web: "'Space Grotesk', Inter, -apple-system, sans-serif", default: "System" }),
  bold: Platform.select({ web: "'Space Grotesk', Inter, -apple-system, sans-serif", default: "System" }),
  mono: Platform.select({ web: "'DM Mono', 'Fira Code', Consolas, monospace", default: "Courier" }),
} as const;

export const type = {
  h1: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, fontWeight: '700' as const },
  h2: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, fontWeight: '600' as const },
  h3: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, letterSpacing: -0.2, fontWeight: '600' as const },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, fontWeight: '400' as const },
  small: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
  caption: { fontFamily: font.regular, fontSize: 11, lineHeight: 15, fontWeight: '400' as const },
  label: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: '500' as const },
  stat: { fontFamily: font.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, fontWeight: '700' as const },
  mono: { fontFamily: font.mono, fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;

export const BREAKPOINT_WIDE = 960;
export const MAX_CONTENT_WIDTH = 1440;

export function useTheme(): { colors: Colors; isDark: boolean } {
  return { colors: dark, isDark: true };
}

export const shadow = (c: Colors, level: 1 | 2 = 1) =>
  Platform.select({
    web: { boxShadow: level === 1 ? `0 1px 3px rgba(0,0,0,0.4)` : `0 8px 24px rgba(0,0,0,0.6)` } as any,
    default: {
      shadowColor: '#000000',
      shadowOpacity: level === 1 ? 0.3 : 0.6,
      shadowRadius: level === 1 ? 3 : 12,
      shadowOffset: { width: 0, height: level === 1 ? 1 : 4 },
      elevation: level === 1 ? 2 : 8,
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
    case 'PASS':
      return 'success';
    case 'AWAITING_APPROVAL':
    case 'unconfigured':
    case 'NEEDS_REVIEW':
    case 'WARN':
      return 'warning';
    case 'FAILED':
    case 'REJECTED':
    case 'error':
    case 'FAIL':
      return 'danger';
    case 'SUBMITTED':
    case 'APPROVED':
    case 'running':
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
