import { View, Text, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ProgressBarProps {
  label: string;
  value: number;
  color?: 'primary' | 'tertiary';
  style?: ViewStyle;
}

export function ProgressBar({ label, value, color = 'primary', style }: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const barColor = color === 'primary' ? colors.primary : colors.tertiary;

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: colors.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onSurface }}>{value}%</Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: colors.surfaceContainer,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${value}%`,
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}
