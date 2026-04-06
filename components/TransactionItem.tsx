import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface TransactionItemProps {
  transaction: {
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    isExpense: boolean;
    status: string;
    icon: string;
    date: string;
  };
  onPress?: () => void;
  style?: ViewStyle;
}

const ICON_MAP: Record<string, string> = {
  'shopping-bag': 'shopping-bag',
  'payments': 'payments',
  'inventory-2': 'inventory-2',
  'receipt': 'receipt',
};

export function TransactionItem({ transaction, onPress, style }: TransactionItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatAmount = (amount: number, isExpense: boolean) => {
    return `${isExpense ? '-' : '+'}MVR ${amount.toFixed(2)}`;
  };

  const iconName = ICON_MAP[transaction.icon] || 'receipt';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.surfaceContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={iconName as any} size={24} color={colors.primary} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.onSurface, fontSize: 14 }}>
            {transaction.title}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>
            {transaction.subtitle}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontWeight: '700',
            fontSize: 14,
            color: transaction.isExpense ? colors.tertiary : colors.primary,
          }}
        >
          {formatAmount(transaction.amount, transaction.isExpense)}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            color: colors.outline,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginTop: 2,
          }}
        >
          {transaction.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
