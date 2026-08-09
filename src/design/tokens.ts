// Cura's product theme: warm neutral canvas, ink-forward chrome, and a
// restrained slate accent. Product identity stays entirely Cura.
export const Colors = {
  accent: '#3A5560',
  accentTint: '#E4DDCB',

  urgent: '#8B4A38',
  attention: '#A07738',
  positive: '#5C7A4A',

  bg: '#EFEAE0',
  surface: '#F7F2E8',
  border: 'rgba(31,31,31,0.10)',

  ink: '#1F1F1F',
  chalk: '#F4F1EA',
  textPrimary: '#1F1F1F',
  textSecondary: '#4A4740',
  textTertiary: '#746D61',
  textOnInkMuted: '#CFC9BC',
} as const;

export const Fonts = {
  display: 'FoundersGrotesk-Regular',
  displayMedium: 'FoundersGrotesk-Medium',
  displaySemibold: 'FoundersGrotesk-Semibold',
  body: 'InstrumentSans-Regular',
  bodyMedium: 'InstrumentSans-Medium',
  bodySemibold: 'InstrumentSans-SemiBold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 2,
  md: 4,
  lg: 4,
  xl: 4,
  pill: 999,
} as const;
