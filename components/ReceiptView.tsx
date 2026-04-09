import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getAdaptiveFontSize } from '@/utils/scaling';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SaleRecord } from '@/types';

interface BusinessInfo {
  name: string;
  accountNumber: string;
  accountName: string;
  viberNumber: string;
}

// Torn paper zigzag edge
function TornEdge({ color = '#F8FAFC', invert = false }: { color?: string; invert?: boolean }) {
  const teeth = 20;
  const toothW = 320 / teeth;
  const toothH = 8;

  return (
    <View style={{ width: 320, height: toothH, overflow: 'hidden', transform: invert ? [{ rotate: '180deg' }] : undefined }}>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: teeth + 1 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: toothW / 2,
              borderRightWidth: toothW / 2,
              borderTopWidth: toothH,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const ReceiptView = forwardRef<View, { sale: SaleRecord; businessInfo?: BusinessInfo }>(function ReceiptView({ sale, businessInfo }, ref) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'transfer': return 'Transfer';
      case 'dharani': return 'Credit';
      default: return method;
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case 'cash': return '#0D9488';
      case 'transfer': return '#DC2626';
      case 'dharani': return '#D97706';
      default: return '#0EA5E9';
    }
  };

  const getPaymentBg = (method: string) => {
    switch (method) {
      case 'cash': return '#0D948815';
      case 'transfer': return '#DC262615';
      case 'dharani': return '#D9770615';
      default: return '#0EA5E915';
    }
  };

  const name = businessInfo?.name || 'Yasir Sales';
  const accountNumber = businessInfo?.accountNumber || '';
  const accountName = businessInfo?.accountName || '';
  const viberNumber = businessInfo?.viberNumber || '';

  return (
    <View ref={ref} style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Torn edge top */}
      <TornEdge color="#F8FAFC" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primaryContainer }]}>
        <MaterialIcons name="store" size={22} color="#FFFFFF" />
        <Text style={[styles.shopName, { color: '#FFFFFF' }]}>{name}</Text>
      </View>

      <View style={styles.saleInfo}>
        <View style={[styles.saleIdChip, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={[styles.saleIdText, { color: colors.primary }]}>{sale.id}</Text>
        </View>
        <Text style={[styles.dateText, { color: colors.outline }]}>{formatTimestamp(sale.timestamp)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        {/* Items Section */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>ITEMS</Text>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colProduct]}>Product</Text>
          <Text style={[styles.colHeader, styles.colQty]}>Qty</Text>
          <Text style={[styles.colHeader, styles.colPrice]}>Price</Text>
          <Text style={[styles.colHeader, styles.colTotal]}>Total</Text>
        </View>

        {/* Items */}
        {sale.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={[styles.itemName, styles.colProduct]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.itemQty, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[styles.itemPrice, styles.colPrice]}>
              {item.price.toFixed(2)}
            </Text>
            <Text style={[styles.itemTotal, styles.colTotal]}>
              {item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.onSurface }]}>
              MVR {sale.subtotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>
              Tax ({sale.taxRate}%)
            </Text>
            <Text style={[styles.summaryValue, { color: colors.onSurface }]}>
              MVR {sale.tax.toFixed(2)}
            </Text>
          </View>
          <View style={styles.thickDivider} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.onSurface }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              MVR {sale.total.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={[styles.paymentLabel, { color: colors.secondary }]}>Payment</Text>
          <View style={[styles.paymentBadge, { backgroundColor: getPaymentBg(sale.paymentMethod) }]}>
            <MaterialIcons
              name={sale.paymentMethod === 'cash' ? 'payments' : sale.paymentMethod === 'transfer' ? 'account-balance' : 'assignment-late'}
              size={14}
              color={getPaymentColor(sale.paymentMethod)}
            />
            <Text style={[styles.paymentValue, { color: getPaymentColor(sale.paymentMethod) }]}>
              {getPaymentLabel(sale.paymentMethod)}
            </Text>
          </View>
        </View>
      </View>

      {/* Account Info */}
      <View style={[styles.accountInfo, { borderTopColor: `${colors.outline}20` }]}>
        <Text style={[styles.accountSectionTitle, { color: colors.secondary }]}>Payment Details</Text>
        {accountName && (
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: colors.secondary }]}>Account Name</Text>
            <Text style={[styles.accountValue, { color: colors.onSurface }]}>{accountName}</Text>
          </View>
        )}
        {accountNumber && (
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: colors.secondary }]}>Account Number</Text>
            <Text style={[styles.accountValue, { color: colors.onSurface }]}>{accountNumber}</Text>
          </View>
        )}
        {viberNumber && (
          <View style={styles.accountRow}>
            <Text style={[styles.accountLabel, { color: colors.secondary }]}>Viber Number</Text>
            <Text style={[styles.accountValue, { color: colors.onSurface }]}>{viberNumber}</Text>
          </View>
        )}
        {!accountName && !accountNumber && !viberNumber && (
          <Text style={[styles.noAccountText, { color: colors.outline }]}>No payment details configured</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.footerDivider, { backgroundColor: `${colors.outline}15` }]} />
        <Text style={[styles.footerText, { color: colors.outline }]}>Thank you for your business!</Text>
      </View>

      {/* Torn edge bottom */}
      <TornEdge color="#F8FAFC" invert />
    </View>
  );
});

ReceiptView.displayName = 'ReceiptView';

const styles = StyleSheet.create({
  container: { width: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  shopName: { fontSize: getAdaptiveFontSize(20), fontWeight: '800' },
  saleInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  saleIdChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  saleIdText: { fontSize: getAdaptiveFontSize(11), fontWeight: '700' },
  dateText: { fontSize: getAdaptiveFontSize(10) },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16, marginVertical: 8 },
  thickDivider: { height: 2, backgroundColor: '#0EA5E920', marginVertical: 6 },
  body: { paddingHorizontal: 16 },
  sectionLabel: { fontSize: getAdaptiveFontSize(9), fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  tableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 4 },
  colHeader: { fontSize: getAdaptiveFontSize(9), fontWeight: '700', letterSpacing: 0.5 },
  colProduct: { flex: 1.5 },
  colQty: { flex: 0.6, textAlign: 'center' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1.2, textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemName: { fontSize: getAdaptiveFontSize(12), fontWeight: '600', lineHeight: 16 },
  itemQty: { fontSize: getAdaptiveFontSize(12), fontWeight: '500' },
  itemPrice: { fontSize: getAdaptiveFontSize(11), fontWeight: '500' },
  itemTotal: { fontSize: getAdaptiveFontSize(13), fontWeight: '700' },
  summary: { paddingTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  summaryLabel: { fontSize: getAdaptiveFontSize(12), fontWeight: '500' },
  summaryValue: { fontSize: getAdaptiveFontSize(12), fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalLabel: { fontSize: getAdaptiveFontSize(16), fontWeight: '800' },
  totalValue: { fontSize: getAdaptiveFontSize(20), fontWeight: '800' },
  paymentSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  paymentLabel: { fontSize: getAdaptiveFontSize(11), fontWeight: '500' },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  paymentValue: { fontSize: getAdaptiveFontSize(12), fontWeight: '700' },
  accountInfo: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  accountSectionTitle: { fontSize: getAdaptiveFontSize(10), fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  accountLabel: { fontSize: getAdaptiveFontSize(10), fontWeight: '500' },
  accountValue: { fontSize: getAdaptiveFontSize(12), fontWeight: '600' },
  noAccountText: { fontSize: getAdaptiveFontSize(11), textAlign: 'center', paddingVertical: 4, fontStyle: 'italic' },
  footer: { paddingHorizontal: 16, paddingVertical: 8 },
  footerDivider: { height: 1, marginBottom: 8 },
  footerText: { fontSize: getAdaptiveFontSize(10), textAlign: 'center', fontStyle: 'italic' },
});

export default ReceiptView;
