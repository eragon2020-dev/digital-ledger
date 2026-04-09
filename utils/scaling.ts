import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions for design (typical phone)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Guideline sizes for scaling
const guidelineBaseWidth = BASE_WIDTH;
const guidelineBaseHeight = BASE_HEIGHT;

/**
 * Scale horizontally based on device width
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / guidelineBaseWidth) * size;
};

/**
 * Scale vertically based on device height
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / guidelineBaseHeight) * size;
};

/**
 * Scale based on device dimensions with moderation factor
 * Uses both width and height to determine optimal scaling
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  const widthScale = SCREEN_WIDTH / guidelineBaseWidth;
  const heightScale = SCREEN_HEIGHT / guidelineBaseHeight;
  const averageScale = (widthScale + heightScale) / 2;
  return size + (size * (averageScale - 1) * factor);
};

/**
 * Scale font size intelligently
 * - Considers both screen dimensions and pixel density
 * - Applies moderate scaling to prevent extreme sizes
 * - Respects user's font scale preferences (accessibility)
 * - Ensures minimum readable font size
 */
export const scaleFontSize = (size: number): number => {
  const scaledSize = moderateScale(size, 0.4);
  
  // Get the font scale from PixelRatio (includes accessibility settings)
  const fontScale = PixelRatio.getFontScale();
  
  // Apply font scale (respects accessibility settings)
  const finalSize = scaledSize * fontScale;
  
  // Ensure minimum readable font size
  const minFontSize = Platform.OS === 'ios' ? 11 : 12;
  
  return Math.max(finalSize, minFontSize);
};

/**
 * Get scaled line height (should be proportional to font size)
 */
export const scaleLineHeight = (fontHeight: number, ratio = 1.4): number => {
  return scaleFontSize(fontHeight) * ratio;
};

/**
 * Get spacing that scales with font size
 */
export const scaleSpacing = (size: number): number => {
  return moderateScale(size, 0.3);
};

/**
 * Get scaled border radius
 */
export const scaleBorderRadius = (size: number): number => {
  return moderateScale(size, 0.3);
};

/**
 * Typography scale with predefined sizes
 * These are semantic tokens that scale proportionally
 */
export const TypographyScale = {
  // Display/Hero text
  display: scaleFontSize(32),      // For hero amounts
  headline1: scaleFontSize(28),    // Page headers
  headline2: scaleFontSize(24),    // Section headers
  headline3: scaleFontSize(22),    // Modal titles
  
  // Title text
  title1: scaleFontSize(20),       // Total values
  title2: scaleFontSize(18),       // Section titles
  title3: scaleFontSize(16),       // Card titles
  
  // Body text
  body1: scaleFontSize(15),        // List titles
  body2: scaleFontSize(14),        // Body text, button text
  body3: scaleFontSize(13),        // Subtitles, form labels
  
  // Caption/Label text
  caption1: scaleFontSize(12),     // Dates, quantities
  caption2: scaleFontSize(11),     // Labels, hints
  caption3: scaleFontSize(10),     // Tab labels, badges
  caption4: scaleFontSize(9),      // Section labels
} as const;

/**
 * Device type detection for more targeted scaling
 */
export const DeviceType = {
  isSmallPhone: SCREEN_WIDTH < 360,
  isMediumPhone: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 400,
  isLargePhone: SCREEN_WIDTH >= 400 && SCREEN_WIDTH < 440,
  isTablet: SCREEN_WIDTH >= 600,
  isSmallHeight: SCREEN_HEIGHT < 700,
  isMediumHeight: SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850,
  isLargeHeight: SCREEN_HEIGHT >= 850,
} as const;

/**
 * Adaptive scaling factor based on device size
 * Smaller devices get less scaling to preserve space
 * Larger devices get more scaling for better readability
 */
export const getAdaptiveScalingFactor = (): number => {
  if (DeviceType.isSmallPhone) return 0.3;
  if (DeviceType.isMediumPhone) return 0.4;
  if (DeviceType.isLargePhone) return 0.5;
  if (DeviceType.isTablet) return 0.6;
  return 0.4; // Default
};

/**
 * Get device-optimized font size
 * Applies adaptive scaling based on device characteristics
 */
export const getAdaptiveFontSize = (baseSize: number): number => {
  const factor = getAdaptiveScalingFactor();
  const scaledSize = moderateScale(baseSize, factor);
  const fontScale = PixelRatio.getFontScale();
  const finalSize = scaledSize * fontScale;
  const minFontSize = Platform.OS === 'ios' ? 11 : 12;
  return Math.max(finalSize, minFontSize);
};
