import { View, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'primary' | 'tertiary';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primaryContainer,
          borderRadius: 32,
          padding: 24,
          overflow: 'hidden',
        };
      case 'tertiary':
        return {
          backgroundColor: colors.tertiaryFixed,
          borderRadius: 24,
          padding: 24,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 24,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        };
      default:
        return {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
        };
    }
  };

  return <View style={[getContainerStyle(), style]}>{children}</View>;
}
