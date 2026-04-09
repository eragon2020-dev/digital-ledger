import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { scaleFontSize, getAdaptiveFontSize } from '../utils/scaling';

export interface ScalableTextProps extends TextProps {
  /** Base font size (will be scaled) */
  fontSize?: number;
  /** Use predefined scale (overrides fontSize if provided) */
  scale?: 'display' | 'h1' | 'h2' | 'h3' | 'title' | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'body' | 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'label' | 'caption' | 'small' | 'tiny';
  /** Font weight */
  weight?: '400' | '500' | '600' | '700' | '800' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  /** Text color */
  color?: string;
  /** Line height multiplier */
  lineHeightMultiplier?: number;
  /** Allow font size to shrink to fit (adds adjustsFontSizeToFit) */
  shrinkToFit?: boolean;
  /** Maximum number of lines (works with shrinkToFit) */
  maxLines?: number;
}

/**
 * Predefined font size scale
 * Maps semantic names to base font sizes
 */
const FONT_SCALE = {
  display: 32,        // Hero amounts
  h1: 28,            // Page headers
  h2: 24,            // Section headers  
  h3: 22,            // Modal titles
  title: 20,         // Total values
  titleLarge: 18,    // Section titles
  titleMedium: 16,   // Card titles
  titleSmall: 15,    // List titles
  body: 14,          // Body text, button text
  bodyLarge: 15,     // Slightly larger body text
  bodyMedium: 13,    // Subtitles, form labels
  bodySmall: 12,     // Dates, quantities
  label: 11,         // Labels, hints
  caption: 10,       // Tab labels, badges
  small: 9,          // Section labels
  tiny: 8,           // Very small text
} as const;

/**
 * Map weight names to numeric values
 */
const WEIGHT_MAP = {
  '400': '400',
  '500': '500',
  '600': '600',
  '700': '700',
  '800': '800',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/**
 * ScalableText - A Text component with automatic font scaling
 * 
 * Usage:
 * <ScalableText fontSize={16}>Normal text</ScalableText>
 * <ScalableText scale="h1">Header</ScalableText>
 * <ScalableText fontSize={14} weight="bold">Bold text</ScalableText>
 * <ScalableText scale="title" shrinkToFit maxLines={1}>Title that fits</ScalableText>
 */
export const ScalableText: React.FC<ScalableTextProps> = ({
  fontSize,
  scale,
  weight,
  color,
  lineHeightMultiplier = 1.4,
  shrinkToFit = false,
  maxLines,
  style,
  ...rest
}) => {
  // Determine base font size
  const baseFontSize = scale ? FONT_SCALE[scale] : (fontSize || 14);
  
  // Calculate scaled font size
  const calculatedFontSize = getAdaptiveFontSize(baseFontSize);
  
  // Map weight
  const fontWeight = weight ? WEIGHT_MAP[weight] || weight : undefined;
  
  // Build style
  const textStyle = StyleSheet.flatten([
    {
      fontSize: calculatedFontSize,
      lineHeight: calculatedFontSize * lineHeightMultiplier,
      ...(fontWeight && { fontWeight: fontWeight as any }),
      ...(color && { color }),
    },
    style,
  ]);

  return (
    <Text
      style={textStyle}
      {...(shrinkToFit && { adjustsFontSizeToFit: true })}
      {...(maxLines !== undefined && { numberOfLines: maxLines })}
      {...rest}
    />
  );
};

/**
 * Shorthand components for common text sizes
 */
export const TextDisplay: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="display" {...props} />
);

export const TextH1: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="h1" {...props} />
);

export const TextH2: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="h2" {...props} />
);

export const TextH3: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="h3" {...props} />
);

export const TextTitle: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="title" {...props} />
);

export const TextTitleLarge: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="titleLarge" {...props} />
);

export const TextTitleMedium: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="titleMedium" {...props} />
);

export const TextTitleSmall: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="titleSmall" {...props} />
);

export const TextBody: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="body" {...props} />
);

export const TextBodyLarge: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="bodyLarge" {...props} />
);

export const TextBodyMedium: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="bodyMedium" {...props} />
);

export const TextBodySmall: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="bodySmall" {...props} />
);

export const TextLabel: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="label" {...props} />
);

export const TextCaption: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="caption" {...props} />
);

export const TextSmall: React.FC<Omit<ScalableTextProps, 'scale'>> = (props) => (
  <ScalableText scale="small" {...props} />
);
