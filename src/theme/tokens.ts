/**
 * Design tokens. Sized to be read at arm's length, often outdoors and in a hurry:
 * body text is 18 pt, nothing is smaller than 16 pt, and every control is at least
 * 56 pt tall (above the 44 pt iOS and 48 dp Android minimums). Text colours meet
 * WCAG AA (4.5:1) against their backgrounds in both schemes; body text meets AAA.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  onDanger: string;
  success: string;
  warning: string;
  overlay: string;
  onOverlay: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    background: '#FFFFFF',
    surface: '#F2F3F5',
    surfaceRaised: '#E6E8EC',
    text: '#111418',
    textMuted: '#4A5059',
    border: '#9AA0A8',
    primary: '#0B57D0',
    onPrimary: '#FFFFFF',
    danger: '#B3261E',
    onDanger: '#FFFFFF',
    success: '#146C2E',
    warning: '#8A5300',
    overlay: 'rgba(0, 0, 0, 0.72)',
    onOverlay: '#FFFFFF',
  },
  dark: {
    background: '#0E1013',
    surface: '#1C1F24',
    surfaceRaised: '#2A2E35',
    text: '#F3F4F6',
    textMuted: '#B8BEC7',
    border: '#5C636E',
    primary: '#A8C7FA',
    onPrimary: '#062E6F',
    danger: '#FFB4AB',
    onDanger: '#690005',
    success: '#6DD58C',
    warning: '#FFB95C',
    overlay: 'rgba(0, 0, 0, 0.72)',
    onOverlay: '#FFFFFF',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

/** Minimum height and width of anything tappable. */
export const touchTarget = 56;

export const typography = {
  small: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  body: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  label: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  mono: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
} as const;

export type TypographyVariant = keyof typeof typography;

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
};
