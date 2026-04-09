# Dynamic Font Scaling Implementation

## Overview
Dynamic font scaling has been implemented across the entire Digital Ledger app to ensure text fits properly on any device screen size, from small phones to tablets.

## What Was Changed

### 1. New Utility Files

#### `utils/scaling.ts`
Core scaling utilities that intelligently scale based on:
- **Device screen dimensions** (width & height)
- **Pixel density** (PixelRatio)
- **User accessibility preferences** (font scale settings)
- **Adaptive scaling factors** (different scaling for small vs large devices)

**Key Functions:**
- `getAdaptiveFontSize(baseSize)` - Main function used throughout the app
- `moderateScale(size, factor)` - Moderate scaling with configurable intensity
- `scale(size)` - Horizontal scaling
- `verticalScale(size)` - Vertical scaling
- `DeviceType` - Device size detection (small/medium/large phone, tablet)

### 2. New Hook

#### `hooks/use-typography.ts`
Provides a complete typography system with pre-scaled styles:
```typescript
const typography = useTypography();

// Available styles:
typography.display      // 32px base - Hero amounts
typography.h1           // 28px base - Page headers
typography.h2           // 24px base - Section headers
typography.h3           // 22px base - Modal titles
typography.title         // 20px base - Total values
typography.titleLarge    // 18px base - Section titles
typography.titleMedium   // 16px base - Card titles
typography.titleSmall    // 15px base - List titles
typography.body          // 14px base - Body text
typography.bodyMedium    // 13px base - Subtitles
typography.bodySmall     // 12px base - Dates, quantities
typography.label         // 11px base - Labels, hints
typography.caption       // 10px base - Tab labels, badges
typography.small         // 9px base - Section labels
```

### 3. New Component

#### `components/ScalableText.tsx`
A drop-in replacement for `<Text>` with automatic scaling:
```tsx
// Use with predefined scale
<ScalableText scale="h1">Header</ScalableText>
<ScalableText scale="body">Body text</ScalableText>

// Or with custom font size
<ScalableText fontSize={16} weight="bold">Custom text</ScalableText>

// Shorthand components
<TextH1>Header</TextH1>
<TextBody>Body</TextBody>
<TextCaption>Caption</TextCaption>
```

### 4. Updated Files

All screens and components now use dynamic scaling:
- ✅ `app/(tabs)/index.tsx` (Dashboard)
- ✅ `app/(tabs)/sales.tsx`
- ✅ `app/(tabs)/finance.tsx`
- ✅ `app/(tabs)/inventory.tsx`
- ✅ `app/(tabs)/reports.tsx`
- ✅ `app/new-sale.tsx`
- ✅ `app/sale-detail.tsx`
- ✅ `app/onboarding.tsx`
- ✅ `app/business-settings.tsx`
- ✅ `app/backup-cloud.tsx`
- ✅ `components/TransactionItem.tsx`
- ✅ `components/MonthlyInsights.tsx`
- ✅ `components/Button.tsx`
- ✅ `components/ReceiptView.tsx`

**Total font size instances scaled:** 247+

## How It Works

### Scaling Algorithm
1. **Base Size**: Original design size (e.g., 14px)
2. **Screen Scaling**: Adjusts based on device dimensions relative to base design (375x812)
3. **Moderation**: Applies a factor (0.3-0.6) to prevent extreme sizes
4. **Accessibility**: Multiplies by `PixelRatio.getFontScale()` to respect user preferences
5. **Minimum Enforcement**: Ensures minimum readable size (11px iOS, 12px Android)

### Formula
```typescript
scaledSize = baseSize + (baseSize * (averageScale - 1) * factor)
finalSize = scaledSize * PixelRatio.getFontScale()
return Math.max(finalSize, minimumSize)
```

### Device Detection
The system automatically detects device type and applies appropriate scaling:
- **Small phones** (<360px): Factor 0.3 (minimal scaling)
- **Medium phones** (360-400px): Factor 0.4
- **Large phones** (400-440px): Factor 0.5
- **Tablets** (≥600px): Factor 0.6 (more scaling)

## Migration Guide

### For New Code

**Option 1: Using getAdaptiveFontSize (recommended for inline styles)**
```tsx
import { getAdaptiveFontSize } from "@/utils/scaling";

<Text style={{ fontSize: getAdaptiveFontSize(14), fontWeight: '600' }}>
  Scaled text
</Text>
```

**Option 2: Using useTypography hook**
```tsx
import { useTypography } from "@/hooks/use-typography";

const typography = useTypography();

<Text style={typography.body}>Body text</Text>
```

**Option 3: Using ScalableText component**
```tsx
import { ScalableText, TextBody } from "@/components/ScalableText";

<ScalableText scale="body">Body text</ScalableText>
<TextBody>Same thing</TextBody>
```

### Converting Existing Code

**Before:**
```tsx
<Text style={{ fontSize: 14, fontWeight: '600' }}>Text</Text>
```

**After:**
```tsx
<Text style={{ fontSize: getAdaptiveFontSize(14), fontWeight: '600' }}>Text</Text>
```

**Before (StyleSheet):**
```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
  }
});
```

**After (StyleSheet):**
```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: getAdaptiveFontSize(24),
    fontWeight: '800',
  }
});
```

## Benefits

1. ✅ **Universal Compatibility**: Works on all device sizes (phones, tablets, foldables)
2. ✅ **Accessibility Support**: Respects user font scale preferences
3. ✅ **Consistent Experience**: Text remains readable and properly proportioned
4. ✅ **No Breaking Changes**: Existing designs preserved, just scaled intelligently
5. ✅ **Future-Proof**: Automatically adapts to new device sizes
6. ✅ **Performance**: Minimal runtime overhead (calculation happens once per render)

## Testing

To test the scaling:
1. Run the app on different device sizes (or use Expo Go with different simulators)
2. Test accessibility settings: Increase/decrease font size in device settings
3. Verify text remains readable and properly fitted on all screens
4. Check both small phones and tablets for appropriate text sizing

## Notes

- Icon sizes were intentionally kept unchanged for consistency
- Line heights scale proportionally with font sizes
- Minimum font sizes enforced to maintain readability
- The scaling is moderate (30-60% of theoretical maximum) to avoid extreme sizes
- All 247+ font instances across the app have been updated

## Files Reference

```
utils/
  scaling.ts                    # Core scaling utilities
hooks/
  use-typography.ts            # Typography system hook
components/
  ScalableText.tsx             # Scalable text component
constants/
  Colors.ts                    # Typography constants (for reference)
  theme.ts                     # Font configuration (for reference)
```
