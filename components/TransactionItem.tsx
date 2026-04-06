import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Transaction } from '@/constants/Data';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  style?: ViewStyle;
}

export function TransactionItem({ transaction, onPress, style }: TransactionItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatAmount = (amount: number, isExpense: boolean) => {
    return `${isExpense ? '-' : '+'}MVR ${amount.toFixed(2)}`;
  };

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
          <Text style={{ fontSize: 20 }}>
            {transaction.icon === 'shopping-bag' ? '🛍️' : transaction.icon === 'payments' ? '💳' : '📦'}
          </Text>
        </View>
        <View>
          <Text style={{ fontWeight: '700', color: colors.onSurface, fontSize: 14 }}>
            {transaction.title}
          </Text>
          <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>
            {transaction.subtitle}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontWeight: '700',
            fontSize: 14,
            color: transaction.isExpense ? colors.tertiary : colors.primary,
          }}
        >
          {formatAmount(transaction.amount, transaction.isExpense)}
        </Text>
        <Text
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
