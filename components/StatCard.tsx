import { View, Text, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  badge?: string;
  style?: ViewStyle;
}

export function StatCard({ icon, label, value, badge, style }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 24,
          padding: 24,
          minHeight: 160,
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <MaterialIcons name={icon as any} size={24} color={colors.secondary} />
        {badge && (
          <View
            style={{
              backgroundColor: colors.surfaceContainer,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: colors.primary,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>
      <View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: colors.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.onSurface,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
