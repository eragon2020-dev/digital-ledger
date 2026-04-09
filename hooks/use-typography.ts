import { useMemo } from 'react';
import { TextStyle } from 'react-native';
import { getAdaptiveFontSize } from '../utils/scaling';
import { useColorScheme } from './use-color-scheme';
import { Colors } from '../constants/Colors';

/**
 * Hook that returns scaled typography styles
 * Provides a complete typography system with device-aware scaling
 */
export function useTypography() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const typography = useMemo(() => {
    const base = {
      // Display/Hero text (32px base)
      display: {
        fontSize: getAdaptiveFontSize(32),
        fontWeight: '800' as const,
        lineHeight: getAdaptiveFontSize(32) * 1.2,
        color: colors.onSurface,
      } as TextStyle,

      // Page headers (28px base)
      h1: {
        fontSize: getAdaptiveFontSize(28),
        fontWeight: '800' as const,
        lineHeight: getAdaptiveFontSize(28) * 1.25,
        color: colors.onSurface,
      } as TextStyle,

      // Section headers (24px base)
      h2: {
        fontSize: getAdaptiveFontSize(24),
        fontWeight: '800' as const,
        lineHeight: getAdaptiveFontSize(24) * 1.3,
        color: colors.onSurface,
      } as TextStyle,

      // Modal titles (22px base)
      h3: {
        fontSize: getAdaptiveFontSize(22),
        fontWeight: '700' as const,
        lineHeight: getAdaptiveFontSize(22) * 1.3,
        color: colors.onSurface,
      } as TextStyle,

      // Total values (20px base)
      title: {
        fontSize: getAdaptiveFontSize(20),
        fontWeight: '800' as const,
        lineHeight: getAdaptiveFontSize(20) * 1.3,
        color: colors.onSurface,
      } as TextStyle,

      // Section titles (18px base)
      titleLarge: {
        fontSize: getAdaptiveFontSize(18),
        fontWeight: '700' as const,
        lineHeight: getAdaptiveFontSize(18) * 1.35,
        color: colors.onSurface,
      } as TextStyle,

      // Card titles (16px base)
      titleMedium: {
        fontSize: getAdaptiveFontSize(16),
        fontWeight: '700' as const,
        lineHeight: getAdaptiveFontSize(16) * 1.4,
        color: colors.onSurface,
      } as TextStyle,

      // List titles (15px base)
      titleSmall: {
        fontSize: getAdaptiveFontSize(15),
        fontWeight: '600' as const,
        lineHeight: getAdaptiveFontSize(15) * 1.4,
        color: colors.onSurface,
      } as TextStyle,

      // Body text, button text (14px base)
      body: {
        fontSize: getAdaptiveFontSize(14),
        fontWeight: '400' as const,
        lineHeight: getAdaptiveFontSize(14) * 1.45,
        color: colors.onSurface,
      } as TextStyle,

      // Body text medium (13px base)
      bodyMedium: {
        fontSize: getAdaptiveFontSize(13),
        fontWeight: '400' as const,
        lineHeight: getAdaptiveFontSize(13) * 1.45,
        color: colors.onSurface,
      } as TextStyle,

      // Body text small (12px base)
      bodySmall: {
        fontSize: getAdaptiveFontSize(12),
        fontWeight: '400' as const,
        lineHeight: getAdaptiveFontSize(12) * 1.45,
        color: colors.onSurface,
      } as TextStyle,

      // Labels, hints (11px base)
      label: {
        fontSize: getAdaptiveFontSize(11),
        fontWeight: '500' as const,
        lineHeight: getAdaptiveFontSize(11) * 1.4,
        color: colors.onSurfaceVariant,
      } as TextStyle,

      // Labels bold
      labelBold: {
        fontSize: getAdaptiveFontSize(11),
        fontWeight: '600' as const,
        lineHeight: getAdaptiveFontSize(11) * 1.4,
        color: colors.onSurface,
      } as TextStyle,

      // Tab labels, badges (10px base)
      caption: {
        fontSize: getAdaptiveFontSize(10),
        fontWeight: '500' as const,
        lineHeight: getAdaptiveFontSize(10) * 1.4,
        color: colors.onSurfaceVariant,
      } as TextStyle,

      // Caption bold
      captionBold: {
        fontSize: getAdaptiveFontSize(10),
        fontWeight: '600' as const,
        lineHeight: getAdaptiveFontSize(10) * 1.4,
        color: colors.onSurface,
      } as TextStyle,

      // Section labels (9px base)
      small: {
        fontSize: getAdaptiveFontSize(9),
        fontWeight: '500' as const,
        lineHeight: getAdaptiveFontSize(9) * 1.4,
        color: colors.onSurfaceVariant,
      } as TextStyle,
    };

    return base;
  }, [colorScheme, colors]);

  return typography;
}

/**
 * Hook that returns scaled spacing values
 */
export function useSpacing() {
  return useMemo(() => ({
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  }), []);
}

/**
 * Hook that returns scaled border radius values
 */
export function useBorderRadius() {
  return useMemo(() => ({
    sm: 4,
    DEFAULT: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  }), []);
}
