import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StockStore } from "@/store/StockStore";
import { SaleDB, ExpenseDB, IncomeDB, getCurrentBusinessId } from "@/database/db";
import { generateMonthlyAnalysis } from "@/database/intelligence";
import { MonthlyInsights } from "@/components/MonthlyInsights";
import { MonthlyAnalysis } from "@/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const [monthlySalesIncome, setMonthlySalesIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyStockCost, setMonthlyStockCost] = useState(0);
  const [monthlyStockPurchases, setMonthlyStockPurchases] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [yearlyIncome, setYearlyIncome] = useState(0);
  const [yearlyExpense, setYearlyExpense] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string>("");
  const [monthlyAnalysis, setMonthlyAnalysis] = useState<MonthlyAnalysis | null>(null);

  useEffect(() => {
    const loadBiz = async () => {
      const biz = await getCurrentBusinessId();
      setBusinessId(biz);
    };
    loadBiz();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    // Use server-side aggregation instead of loading ALL data
    const mSalesIncome = await SaleDB.getMonthlyTotal(businessId, selectedYear, selectedMonth + 1);
    const mManualIncome = await IncomeDB.getMonthlyTotal(businessId, selectedYear, selectedMonth + 1);

    setMonthlySalesIncome(mSalesIncome + mManualIncome);

    // Monthly stock purchases (cash spent on inventory this month)
    const mStockPurchases = await ExpenseDB.getMonthlyTotalByType(businessId, selectedYear, selectedMonth + 1, 'stock');
    setMonthlyStockPurchases(mStockPurchases);

    // Monthly stock cost (COGS)
    const mStockCost = await StockStore.getMonthlyStockCost(selectedYear, selectedMonth + 1);
    setMonthlyStockCost(mStockCost);

    // Monthly non-stock expenses
    const mExpenses = await ExpenseDB.getMonthlyTotal(businessId, selectedYear, selectedMonth + 1);
    setMonthlyExpenses(mExpenses + mStockCost);

    // Yearly totals
    const yearSalesIncome = await SaleDB.getYearlyTotal(businessId, selectedYear);
    const yearManualIncome = await IncomeDB.getYearlyTotal(businessId, selectedYear);
    setYearlyIncome(yearSalesIncome + yearManualIncome);

    const yearExpenses = await ExpenseDB.getYearlyTotal(businessId, selectedYear);
    const yearStockCost = await StockStore.getYearlyStockCost(selectedYear);
    setYearlyExpense(yearExpenses + yearStockCost);

    // Top products
    const tops = await StockStore.getTopProducts(selectedYear, selectedMonth + 1);
    setTopProducts(tops || []);

    // Sales count for the selected month
    const fromDate = new Date(selectedYear, selectedMonth, 1);
    const toDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const count = await StockStore.getSalesCount({ fromDate, toDate });
    setSalesCount(count);

    // Generate monthly business analysis
    const analysis = await generateMonthlyAnalysis(businessId, selectedYear, selectedMonth + 1);
    setMonthlyAnalysis(analysis);

    setIsLoading(false);
  }, [selectedYear, selectedMonth, businessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const monthlyProfit = monthlySalesIncome - monthlyExpenses;
  const yearlyProfit = yearlyIncome - yearlyExpense;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: insets.bottom + 100,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header Card with Year Dropdown */}
      <View
        style={[styles.header, { backgroundColor: colors.primaryContainer }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSub}>
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
          </View>
          {/* Year Dropdown - Right side */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.yearDropdown,
                { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
              activeOpacity={0.7}
              onPress={() => setShowYearDropdown(!showYearDropdown)}
            >
              <Text style={styles.yearText}>{selectedYear}</Text>
              <MaterialIcons
                name={
                  showYearDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"
                }
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            {showYearDropdown && (
              <View
                style={[
                  styles.yearDropdownList,
                  { backgroundColor: colors.surfaceContainerLowest },
                ]}
              >
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[
                      styles.yearOption,
                      {
                        backgroundColor:
                          y === selectedYear ? colors.primary : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setSelectedYear(y);
                      setShowYearDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color:
                          y === selectedYear ? "#FFFFFF" : colors.onSurface,
                      }}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Month Selector - Full names */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthRow}
        >
          {MONTHS.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.monthBtn,
                {
                  backgroundColor:
                    i === selectedMonth
                      ? colors.primary
                      : colors.surfaceContainer,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedMonth(i)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: i === selectedMonth ? colors.white : colors.secondary,
                }}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loading}>
            <Text style={{ color: colors.secondary }}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Monthly Summary */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Monthly Summary
              </Text>
              <View style={styles.summaryGrid}>
                <View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: colors.primaryContainer },
                  ]}
                >
                  <MaterialIcons
                    name="trending-up"
                    size={18}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text style={styles.summaryCardLabel}>Income</Text>
                  <Text style={styles.summaryCardValue}>
                    MVR {fmt(monthlySalesIncome)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <MaterialIcons
                    name="trending-down"
                    size={18}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text style={styles.summaryCardLabel}>Expenses</Text>
                  <Text style={styles.summaryCardValue}>
                    MVR {fmt(monthlyExpenses)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.profitCard,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: `${colors.outline}10`,
                  },
                ]}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <MaterialIcons
                    name={monthlyProfit >= 0 ? "account-balance-wallet" : "trending-down"}
                    size={18}
                    color={
                      monthlyProfit >= 0 ? colors.primary : colors.tertiary
                    }
                  />
                  <Text
                    style={[styles.profitLabel, { color: colors.secondary }]}
                  >
                    {monthlyProfit >= 0 ? "Monthly Profit" : "Monthly Loss"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.profitValue,
                    {
                      color:
                        monthlyProfit >= 0 ? colors.primary : colors.tertiary,
                    },
                  ]}
                >
                  {monthlyProfit >= 0 ? "" : "-"}MVR {fmt(Math.abs(monthlyProfit))}
                </Text>
              </View>
            </View>

            {/* Monthly Business Analysis */}
            {monthlyAnalysis && (
              <MonthlyInsights analysis={monthlyAnalysis} />
            )}

            {/* Sales Stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Sales Statistics
              </Text>
              <View
                style={[
                  styles.statsCard,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: `${colors.outline}10`,
                  },
                ]}
              >
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <MaterialIcons
                      name="receipt-long"
                      size={20}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.statValue, { color: colors.onSurface }]}
                    >
                      {salesCount}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.secondary }]}
                    >
                      Sales
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: `${colors.outline}15` },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <MaterialIcons
                      name="shopping-bag"
                      size={20}
                      color={colors.secondary}
                    />
                    <Text
                      style={[styles.statValue, { color: colors.onSurface }]}
                    >
                      {topProducts.reduce((s, p) => s + (p.total_qty || 0), 0)}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.secondary }]}
                    >
                      Sold
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Inventory Costs for Selected Month */}
            <View
              style={[
                styles.inventoryCostCard,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: `${colors.outline}10`,
                },
              ]}
            >
              <View style={styles.inventoryCostHeader}>
                <MaterialIcons name="inventory-2" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.inventoryCostTitle, { color: colors.onSurface }]}>
                    Inventory Costs
                  </Text>
                  <Text style={[styles.inventoryCostSub, { color: colors.secondary }]}>
                    {MONTHS[selectedMonth]} {selectedYear}
                  </Text>
                </View>
              </View>
              <View style={styles.inventoryCostRows}>
                <View style={styles.inventoryCostRow}>
                  <Text style={[styles.inventoryCostLabel, { color: colors.secondary }]}>
                    Stock Purchased
                  </Text>
                  <Text style={[styles.inventoryCostValue, { color: colors.onSurface }]}>
                    MVR {fmt(monthlyStockPurchases)}
                  </Text>
                </View>
                <View style={styles.inventoryCostDivider} />
                <View style={styles.inventoryCostRow}>
                  <Text style={[styles.inventoryCostLabel, { color: colors.secondary }]}>
                    COGS (Items Sold)
                  </Text>
                  <Text style={[styles.inventoryCostValue, { color: "#F59E0B" }]}>
                    MVR {fmt(monthlyStockCost)}
                  </Text>
                </View>
                {monthlyStockPurchases > 0 && monthlyStockCost > 0 && (
                  <>
                    <View style={styles.inventoryCostDivider} />
                    <View style={styles.inventoryCostRow}>
                      <Text style={[styles.inventoryCostLabel, { color: colors.secondary }]}>
                        Unsold (Asset Value)
                      </Text>
                      <Text style={[styles.inventoryCostValue, { color: colors.primary }]}>
                        MVR {fmt(Math.max(0, monthlyStockPurchases - monthlyStockCost))}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              <Text style={[styles.inventoryCostNote, { color: colors.outline }]}>
                Stock purchases are assets. COGS = cost of items actually sold.
              </Text>
            </View>

            {/* Top Products */}
            {topProducts.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: colors.onSurface }]}
                >
                  Top Selling
                </Text>
                <View
                  style={[
                    styles.topCard,
                    {
                      backgroundColor: colors.surfaceContainerLowest,
                      borderColor: `${colors.outline}10`,
                    },
                  ]}
                >
                  {topProducts.map((p, i) => (
                    <View key={i} style={styles.topRow}>
                      <Text style={[styles.topRank, { color: colors.outline }]}>
                        #{i + 1}
                      </Text>
                      <Text
                        style={[styles.topName, { color: colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {p.product_name}
                      </Text>
                      <Text
                        style={[styles.topQty, { color: colors.secondary }]}
                      >
                        {p.total_qty} units
                      </Text>
                      <Text
                        style={[styles.topRevenue, { color: colors.primary }]}
                      >
                        MVR {fmt(p.total_revenue)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Yearly Summary */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                {selectedYear} Year Summary
              </Text>
              <View
                style={[
                  styles.yearCard,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: `${colors.outline}10`,
                  },
                ]}
              >
                <View style={styles.yearRow2}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialIcons
                      name="arrow-upward"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.yearLabel, { color: colors.secondary }]}
                    >
                      Income
                    </Text>
                  </View>
                  <Text style={[styles.yearValue, { color: colors.primary }]}>
                    MVR {fmt(yearlyIncome)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.yearRow2,
                    {
                      borderTopWidth: 1,
                      borderTopColor: `${colors.outline}10`,
                      paddingTop: 12,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialIcons
                      name="arrow-downward"
                      size={16}
                      color={colors.tertiary}
                    />
                    <Text
                      style={[styles.yearLabel, { color: colors.secondary }]}
                    >
                      Expenses
                    </Text>
                  </View>
                  <Text style={[styles.yearValue, { color: colors.tertiary }]}>
                    MVR {fmt(yearlyExpense)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.yearRow2,
                    {
                      borderTopWidth: 1,
                      borderTopColor: `${colors.outline}10`,
                      paddingTop: 12,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MaterialIcons
                      name={yearlyProfit >= 0 ? "account-balance-wallet" : "trending-down"}
                      size={16}
                      color={
                        yearlyProfit >= 0 ? colors.primary : colors.tertiary
                      }
                    />
                    <Text
                      style={[styles.yearLabel, { color: colors.secondary }]}
                    >
                      {yearlyProfit >= 0 ? "Profit" : "Loss"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.yearValue,
                      {
                        color:
                          yearlyProfit >= 0 ? colors.primary : colors.tertiary,
                      },
                    ]}
                  >
                    {yearlyProfit >= 0 ? "" : "-"}MVR {fmt(Math.abs(yearlyProfit))}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    position: "relative",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: {
    position: "relative",
  },
  yearDropdown: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    minWidth: 80,
  },
  yearText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  yearDropdownList: {
    position: "absolute",
    top: 48,
    left: 0,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  monthRow: { gap: 8 },
  monthBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  loading: { alignItems: "center", paddingVertical: 60 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  summaryGrid: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    minHeight: 100,
    justifyContent: "space-between",
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  summaryCardValue: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  profitCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  profitLabel: { fontSize: 13, fontWeight: "600" },
  profitValue: { fontSize: 24, fontWeight: "800", marginTop: 6 },
  statsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 6 },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, height: 40 },
  topCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    gap: 8,
  },
  topRank: { fontSize: 12, fontWeight: "700", width: 24 },
  topName: { flex: 1, fontSize: 13, fontWeight: "600" },
  topQty: { fontSize: 12, fontWeight: "500" },
  topRevenue: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 80,
    textAlign: "right",
  },
  yearCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  yearRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  yearLabel: { fontSize: 14, fontWeight: "500" },
  yearValue: { fontSize: 18, fontWeight: "800" },
  inventoryCostCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  inventoryCostHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  inventoryCostTitle: { fontSize: 16, fontWeight: "700" },
  inventoryCostSub: { fontSize: 12 },
  inventoryCostRows: { gap: 8 },
  inventoryCostRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inventoryCostLabel: { fontSize: 13, fontWeight: "500" },
  inventoryCostValue: { fontSize: 15, fontWeight: "700" },
  inventoryCostDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.05)" },
  inventoryCostNote: { fontSize: 9, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", textAlign: "center", fontStyle: "italic" },
});
