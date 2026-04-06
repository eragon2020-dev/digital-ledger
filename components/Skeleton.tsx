import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, DimensionValue, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animValue]);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceContainerHigh,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 16,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    >
      <Skeleton width="100%" height={160} borderRadius={12} />
      <Skeleton width="70%" height={16} />
      <Skeleton width="40%" height={14} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
        },
        style,
      ]}
    >
      <Skeleton width="60%" height={16} />
      <Skeleton width="25%" height={16} />
    </View>
  );
}

export function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}
