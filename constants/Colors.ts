// Sky Blue & White color scheme
export const Colors = {
  light: {
    primary: '#0EA5E9',
    primaryDark: '#0284C7',
    primaryContainer: '#0284C7',
    onPrimaryContainer: '#E0F2FE',
    surfaceContainer: '#F1F5F9',
    surfaceContainerHigh: '#E2E8F0',
    surfaceContainerHighest: '#CBD5E1',
    surfaceContainerLow: '#F8FAFC',
    surfaceContainerLowest: '#FFFFFF',
    secondary: '#64748B',
    tertiary: '#F43F5E',
    tertiaryFixed: '#FFE4E6',
    outline: '#94A3B8',
    onSurface: '#0F172A',
    onSurfaceVariant: '#475569',
    background: '#F8FAFC',
    white: '#FFFFFF',
    primaryShadow: 'rgba(14, 165, 233, 0.2)',
  },
  dark: {
    primary: '#38BDF8',
    primaryContainer: '#0284C7',
    onPrimaryContainer: '#E0F2FE',
    surfaceContainer: '#1E293B',
    surfaceContainerHigh: '#334155',
    surfaceContainerHighest: '#475569',
    surfaceContainerLow: '#0F172A',
    surfaceContainerLowest: '#020617',
    secondary: '#94A3B8',
    tertiary: '#FB7185',
    tertiaryFixed: '#881337',
    outline: '#64748B',
    onSurface: '#E2E8F0',
    onSurfaceVariant: '#CBD5E1',
    background: '#020617',
    white: '#0F172A',
    primaryShadow: 'rgba(56, 189, 248, 0.2)',
  },
};

export const Typography = {
  headline: {
    fontFamily: 'System',
    fontWeight: '800' as const,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
};

export const BorderRadius = {
  sm: 4,
  DEFAULT: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};
