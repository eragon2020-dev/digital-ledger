import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { getAdaptiveFontSize } from "@/utils/scaling";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StockStore } from "@/store/StockStore";
import { SaleRecord, BusinessInfo, PaginatedResult } from "@/types";
import ReceiptView from "@/components/ReceiptView";

const PAGE_SIZE = 50;

export default function SalesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: "",
    accountNumber: "",
    accountName: "",
    viberNumber: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [shareSale, setShareSale] = useState<SaleRecord | null>(null);
  const receiptRef = useRef<ViewShot>(null);

  // Pagination state
  const [paginatedData, setPaginatedData] = useState<PaginatedResult<SaleRecord> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);

  // Date filters (server-side)
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const paginatedDataRef = useRef<PaginatedResult<SaleRecord> | null>(null);

  const loadSales = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setPaginatedData(null);
        setSales([]);
      }

      const options: any = {
        limit: PAGE_SIZE,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };

      const currentData = reset ? null : paginatedDataRef.current;
      if (!reset && currentData?.cursor) {
        options.cursor = currentData.cursor;
      }

      const result = await StockStore.getPaginatedSales(options);
      const count = await StockStore.getSalesCount({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setTotalCount(count);

      // Load total from DB (not just current page)
      const allTimeTotal = await StockStore.getAllTimeTotal();
      setTotalSales(allTimeTotal);

      if (reset) {
        setSales(result.data);
      } else {
        setSales((prev) => [...prev, ...result.data]);
      }
      setPaginatedData(result);
      paginatedDataRef.current = result;
    } catch (error) {
      console.error("Error loading sales:", error);
    }
  }, [fromDate, toDate]);

  const loadMore = useCallback(async () => {
    if (!paginatedDataRef.current?.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    await loadSales(false);
    setLoadingMore(false);
  }, [loadingMore, loadSales]);

  const applyDateFilter = useCallback(() => {
    loadSales(true);
    setShowDateFilter(false);
  }, [loadSales]);

  const clearDateFilter = () => {
    setFilterFrom("");
    setFilterTo("");
    setFromDate(null);
    setToDate(null);
    setShowFromPicker(false);
    setShowToPicker(false);
    setShowDateFilter(false);
    loadSales(true);
  };

  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromPicker(Platform.OS === "ios");
    if (selectedDate) {
      setFromDate(selectedDate);
      setFilterFrom(selectedDate.toISOString().split("T")[0]);
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToPicker(Platform.OS === "ios");
    if (selectedDate) {
      setToDate(selectedDate);
      setFilterTo(selectedDate.toISOString().split("T")[0]);
    }
  };

  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    loadSales(true);
    const loadInfo = async () => {
      const info = await StockStore.getBusinessInfo();
      setBusinessInfo(info);
    };
    loadInfo();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSales(true);
    }, [loadSales]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSales(true);
    setRefreshing(false);
  }, [loadSales]);

  const handleDelete = (saleId: string) => {
    Alert.alert(
      "Delete Sale",
      "Deleting this sale will restore stock. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await StockStore.deleteSale(saleId);
            loadSales(true);
          },
        },
      ],
    );
  };

  const handleEdit = (saleId: string) => {
    router.push({
      pathname: "/sale-detail" as any,
      params: { saleId },
    });
  };

  const handleShare = async (saleToShare: SaleRecord) => {
    setShareSale(saleToShare);
    setTimeout(async () => {
      if (!receiptRef.current?.capture) return;
      try {
        const uri = await receiptRef.current.capture();
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Sale Receipt",
        });
      } catch (error) {
        console.error("Share error:", error);
      } finally {
        setShareSale(null);
      }
    }, 100);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Cash";
      case "transfer":
        return "Transfer";
      case "dharani":
        return "Credit";
      default:
        return method;
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "payments";
      case "transfer":
        return "account-balance";
      case "dharani":
        return "assignment-late";
      default:
        return "payments";
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case "cash":
        return colors.primary;
      case "transfer":
        return colors.tertiary;
      case "dharani":
        return "#F59E0B";
      default:
        return colors.primary;
    }
  };

  // Render each sale item
  const renderSaleItem = useCallback(({ item: sale }: { item: SaleRecord }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={() => {
        Alert.alert(sale.id, undefined, [
          { text: "Cancel", style: "cancel" },
          { text: "Share Receipt", onPress: () => handleShare(sale) },
        ]);
      }}
      style={[
        styles.saleCard,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: `${colors.outline}10`,
        },
      ]}
    >
      {/* Sale Header */}
      <View style={styles.saleHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.saleIdBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.saleIdText, { color: colors.primary }]}>
              {sale.id}
            </Text>
          </View>
          <View style={[styles.paymentChip, { backgroundColor: `${colors.secondary}15` }]}>
            <MaterialIcons
              name={getPaymentIcon(sale.paymentMethod) as any}
              size={12}
              color={getPaymentColor(sale.paymentMethod)}
            />
            <Text
              style={[styles.paymentChipText, { color: getPaymentColor(sale.paymentMethod) }]}
            >
              {getPaymentLabel(sale.paymentMethod)}
            </Text>
            {sale.taxRate > 0 && (
              <Text style={[styles.taxChipText, { color: colors.primary, marginLeft: 6 }]}>
                Tax {sale.taxRate}%
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.saleDate, { color: colors.outline }]}>
          {formatTimestamp(sale.timestamp)}
        </Text>
      </View>

      {/* Sale Items */}
      <View style={styles.saleItems}>
        {sale.items.map((item, idx) => (
          <View key={idx} style={styles.saleItemRow}>
            <Text style={[styles.saleItemName, { color: colors.onSurface }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.saleItemQty, { color: colors.secondary }]}>
              x{item.quantity}
            </Text>
            <Text style={[styles.saleItemTotal, { color: colors.primary }]}>
              MVR {item.total.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Sale Summary */}
      <View style={[styles.saleSummary, { borderTopColor: `${colors.outline}15` }]}>
        <View style={styles.saleSummaryRow}>
          <Text style={[styles.saleSummaryLabel, { color: colors.secondary }]}>Subtotal</Text>
          <Text style={[styles.saleSummaryValue, { color: colors.onSurface }]}>
            MVR {sale.subtotal.toFixed(2)}
          </Text>
        </View>
        <View style={styles.saleSummaryRow}>
          <Text style={[styles.saleSummaryLabel, { color: colors.secondary }]}>Tax</Text>
          <Text style={[styles.saleSummaryValue, { color: colors.onSurface }]}>
            MVR {sale.tax.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.saleSummaryRow, styles.saleTotalRow]}>
          <Text style={[styles.saleTotalLabel, { color: colors.onSurface }]}>Total</Text>
          <Text style={[styles.saleTotalValue, { color: colors.primary }]}>
            MVR {sale.total.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.saleActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}
          activeOpacity={0.7}
          onPress={() => handleEdit(sale.id)}
        >
          <MaterialIcons name="edit" size={16} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: `${colors.tertiary}15` }]}
          activeOpacity={0.7}
          onPress={() => handleDelete(sale.id)}
        >
          <MaterialIcons name="delete" size={16} color={colors.tertiary} />
          <Text style={[styles.actionBtnText, { color: colors.tertiary }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [colors, handleShare]);

  // Footer for loading more
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.secondary }]}>Loading more...</Text>
      </View>
    );
  };

  // Empty state
  const renderEmpty = () => {
    if (refreshing) return null;
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="receipt-long" size={64} color={colors.outline} />
        <Text style={[styles.emptyText, { color: colors.secondary }]}>
          {totalCount === 0 ? "No sales yet" : "No results"}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.outline }]}>
          {totalCount === 0 ? "Tap the + button to make a sale" : "Try adjusting the date filter"}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primaryContainer }]}>
        <View style={[styles.headerDecoration, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        <View style={[styles.headerDecoration2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
        <View style={styles.headerTop}>
          <View style={styles.headerTitleSection}>
            <Text numberOfLines={1} style={styles.headerTitle}>Sales</Text>
            <Text style={styles.headerSubtitle}>
              {totalCount.toLocaleString()} transactions
            </Text>
          </View>
          {sales.length > 0 && (
            <View style={styles.headerTotal}>
              <Text style={styles.headerTotalLabel}>Total</Text>
              <Text style={styles.headerTotalValue}>
                MVR {totalSales.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            activeOpacity={0.7}
            onPress={() => setShowDateFilter(!showDateFilter)}
          >
            <MaterialIcons name="date-range" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            activeOpacity={0.7}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: "#FFFFFF" }]}
            activeOpacity={0.7}
            onPress={() => router.push("/new-sale" as any)}
          >
            <MaterialIcons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Filter */}
      {showDateFilter && (
        <View
          style={[
            styles.dateFilterCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: `${colors.outline}10`,
            },
          ]}
        >
          <View style={styles.dateFilterHeader}>
            <MaterialIcons name="date-range" size={20} color={colors.primary} />
            <Text style={[styles.dateFilterTitle, { color: colors.onSurface }]}>
              Filter by Date
            </Text>
          </View>

          <View style={styles.datePickerRow}>
            {/* From Date */}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  styles.datePickerBtn,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outline,
                  },
                ]}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={[styles.datePickerLabel, { color: colors.secondary }]}>From</Text>
                <Text style={[styles.datePickerValue, { color: colors.onSurface }]}>
                  {formatDateForDisplay(fromDate)}
                </Text>
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={fromDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleFromDateChange}
                  textColor={colors.onSurface}
                />
              )}
            </View>

            {/* To Date */}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  styles.datePickerBtn,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outline,
                  },
                ]}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={[styles.datePickerLabel, { color: colors.secondary }]}>To</Text>
                <Text style={[styles.datePickerValue, { color: colors.onSurface }]}>
                  {formatDateForDisplay(toDate)}
                </Text>
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={toDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleToDateChange}
                  textColor={colors.onSurface}
                />
              )}
            </View>
          </View>

          <View style={styles.dateFilterBtns}>
            <TouchableOpacity
              style={[styles.dateFilterBtn, { backgroundColor: colors.outline }]}
              onPress={clearDateFilter}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateFilterBtn, { backgroundColor: colors.primary }]}
              onPress={applyDateFilter}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sales List */}
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={renderSaleItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Hidden Receipt for sharing */}
      {shareSale && (
        <View style={styles.hiddenReceipt}>
          <ViewShot
            ref={receiptRef}
            options={{ format: "png", result: "tmpfile" }}
          >
            <ReceiptView sale={shareSale} businessInfo={businessInfo} />
          </ViewShot>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderRadius: 24, padding: 24, overflow: "hidden", marginHorizontal: 16, marginTop: 16 },
  headerDecoration: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -30,
    right: -20,
  },
  headerDecoration2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -20,
    left: -10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerTitleSection: { flex: 1 },
  headerTitle: { fontSize: getAdaptiveFontSize(24), fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: {
    fontSize: getAdaptiveFontSize(13),
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  headerTotal: { alignItems: "flex-end" },
  headerTotalLabel: {
    fontSize: getAdaptiveFontSize(10),
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTotalValue: { fontSize: getAdaptiveFontSize(20), fontWeight: "800", color: "#FFFFFF" },
  headerActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateFilterCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
    marginHorizontal: 16,
  },
  dateFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dateFilterTitle: { fontSize: getAdaptiveFontSize(14), fontWeight: "700" },
  datePickerRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  datePickerLabel: { fontSize: getAdaptiveFontSize(11), fontWeight: "600" },
  datePickerValue: {
    fontSize: getAdaptiveFontSize(13),
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  dateFilterBtns: { flexDirection: "row", gap: 8, marginTop: 10 },
  dateFilterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  listContent: { paddingHorizontal: 16, gap: 16, paddingTop: 16 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: { fontSize: getAdaptiveFontSize(18), fontWeight: "700" },
  emptySubtext: { fontSize: getAdaptiveFontSize(14) },
  saleCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  saleIdBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saleIdText: { fontSize: getAdaptiveFontSize(12), fontWeight: "700" },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paymentChipText: { fontSize: getAdaptiveFontSize(10), fontWeight: "600" },
  taxChipText: { fontSize: getAdaptiveFontSize(10), fontWeight: "600" },
  saleDate: { fontSize: getAdaptiveFontSize(12) },
  saleItems: { gap: 8, marginBottom: 16 },
  saleItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  saleItemName: { fontSize: getAdaptiveFontSize(14), fontWeight: "600", flex: 1 },
  saleItemQty: { fontSize: getAdaptiveFontSize(12), marginHorizontal: 8 },
  saleItemTotal: { fontSize: getAdaptiveFontSize(13), fontWeight: "700" },
  saleSummary: { paddingTop: 12, borderTopWidth: 1, gap: 6, marginBottom: 16 },
  saleSummaryRow: { flexDirection: "row", justifyContent: "space-between" },
  saleSummaryLabel: { fontSize: getAdaptiveFontSize(13) },
  saleSummaryValue: { fontSize: getAdaptiveFontSize(13), fontWeight: "600" },
  saleTotalRow: { paddingTop: 8 },
  saleTotalLabel: { fontSize: getAdaptiveFontSize(16), fontWeight: "700" },
  saleTotalValue: { fontSize: getAdaptiveFontSize(20), fontWeight: "800" },
  saleActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: getAdaptiveFontSize(14), fontWeight: "600" },
  hiddenReceipt: { position: "absolute", left: -9999, top: 0 },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  footerText: { fontSize: getAdaptiveFontSize(14) },
});
