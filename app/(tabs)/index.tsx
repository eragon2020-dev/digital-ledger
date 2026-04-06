import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDatabase } from "@/providers/DatabaseProvider";
import { Card } from "@/components/Card";
import { TransactionItem } from "@/components/TransactionItem";
import { StockStore } from "@/store/StockStore";
import { SaleRecord } from "@/types";
import {
  getAllBusinesses,
  setCurrentBusinessId,
  getCurrentBusinessId,
  createBusiness,
  deleteBusiness,
  BusinessRecord,
} from "@/database/db";
import { getProfitAnalytics } from "@/database/analytics";

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady } = useDatabase();

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [initialCapital, setInitialCapital] = useState(0);
  const [netProfit, setNetProfit] = useState(0); // All-time profit/loss
  const [showCapitalEdit, setShowCapitalEdit] = useState(false);
  const [capitalInput, setCapitalInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [currentBusinessId, setCurrentBizId] = useState<string>("");
  const [businessNameInput, setBusinessNameInput] = useState("");
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BusinessRecord | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const loadData = useCallback(async () => {
    if (!isReady) {
      // Skip if database not ready
      return;
    }

    try {
      // Load only recent sales for dashboard (not ALL sales)
      const salesData = await StockStore.getRecentSales(20);
      setSales(salesData);

      // Get accurate totals from DB (not from limited recent sales)
      const todayTotalVal = await StockStore.getTodayTotal();
      setTodayTotal(todayTotalVal);
      const todayCount = await StockStore.getTodayCount();
      setTotalTransactions(todayCount);

      const cap = await StockStore.getCapital();
      setInitialCapital(cap);

      const name = await StockStore.getBusinessName();
      setBusinessName(name);

      const bizId = await getCurrentBusinessId();
      setCurrentBizId(bizId);

      const allBiz = await getAllBusinesses();
      setBusinesses(allBiz);

      const now = new Date();

      // Calculate all-time profit for capital calculation
      // Net Profit = (Total Revenue - Total COGS) - Total Non-Stock Expenses + Total Manual Income
      const profitData = await getProfitAnalytics(bizId);
      const totalRevenue = profitData.totalRevenue;
      const totalCOGS = profitData.totalCost;
      const grossProfit = totalRevenue - totalCOGS;

      // Get non-stock expenses total from DB (not client-side filter)
      const nonStockExpensesTotal = await StockStore.getNonStockExpensesTotal();

      // Get all manual income total from DB (not client-side filter)
      const totalManualIncome = await StockStore.getTotalIncome();

      // Net profit = gross profit - non-stock expenses + manual income
      const calculatedNetProfit = grossProfit - nonStockExpensesTotal + totalManualIncome;
      setNetProfit(calculatedNetProfit);

      // Load only recent expenses for monthly display (not used in capital calc)
      const recentExpenses = await StockStore.getRecentExpenses(200);
      const manualExpenses = recentExpenses
        .filter(
          (e) =>
            e.timestamp.getMonth() === now.getMonth() &&
            e.timestamp.getFullYear() === now.getFullYear(),
        )
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculate paid and pending from DB (all sales, not just recent 20)
      const paymentTotals = await StockStore.getTotalByPaymentStatus();
      setPaidAmount(paymentTotals.paid);
      setPendingAmount(paymentTotals.unpaid);

      // Don't throw - let the app continue with partial data
    } catch (error) {
      console.error('loadData error:', error);
    }
  }, [isReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCapitalLongPress = () => {
    setCapitalInput(String(initialCapital));
    setShowCapitalEdit(true);
  };

  const saveCapital = async () => {
    const amount = parseFloat(capitalInput) || 0;
    await StockStore.setCapital(amount);
    setInitialCapital(amount);
    setShowCapitalEdit(false);
  };

  const saveBusinessName = async () => {
    const name = businessNameInput.trim();
    if (currentBusinessId) {
      await StockStore.setBusinessName(name);
      setBusinessName(name);
    }
    setShowBusinessDropdown(false);
  };

  const switchBusiness = async (bizId: string) => {
    await setCurrentBusinessId(bizId);
    setCurrentBizId(bizId);
    setShowBusinessDropdown(false);
    await loadData(); // Reload data for new business
  };

  const addNewBusiness = async () => {
    const name = newBusinessName.trim();
    if (!name) return;

    const id = await createBusiness({ name });
    await switchBusiness(id);
    setShowAddBusiness(false);
    setNewBusinessName("");
    await loadData();
  };

  const handleDeleteBusiness = (biz: BusinessRecord) => {
    setDeleteTarget(biz);
    setDeleteInput("");
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBusiness = async () => {
    if (!deleteTarget) return;
    if (deleteInput !== deleteTarget.name) {
      Alert.alert("Name Mismatch", "The name you typed does not match the business name. Please type it exactly.");
      return;
    }
    try {
      await deleteBusiness(deleteTarget.id);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteInput("");
      await loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete business");
    }
  };

  const openBusinessNameEdit = () => {
    setBusinessNameInput(businessName);
    setShowBusinessDropdown(true);
  };

  const remainingCapital = initialCapital + netProfit;

  // Convert SaleRecord to TransactionItem format - show more
  const recentTransactions = sales.slice(0, 10).map((sale) => ({
    id: sale.id,
    title: `Sale ${sale.id}`,
    subtitle: `${sale.items.length} items • ${sale.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
    amount: sale.total,
    isExpense: false,
    status: "Completed",
    icon: "shopping-bag",
    date: sale.timestamp.toISOString(),
    ref: sale.id,
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Capital Card - Top */}
      <View
        style={[
          styles.capitalCardWrapper,
          { backgroundColor: colors.primaryContainer },
        ]}
      >
        <View style={styles.capitalCardHeaderRow}>
          <TouchableOpacity
            style={styles.businessNameBtn}
            activeOpacity={0.7}
            onPress={() => {
              setBusinessNameInput(businessName);
              setShowBusinessDropdown(true);
            }}
          >
            <MaterialIcons
              name="store"
              size={16}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.businessNameText} numberOfLines={1}>
              {businessName || "Select Business"}
            </Text>
            <MaterialIcons
              name="arrow-drop-down"
              size={20}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/business-settings" as any)}
          >
            <MaterialIcons
              name="settings"
              size={22}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={handleCapitalLongPress}
          style={styles.capitalCardInner}
        >
          <View style={styles.capitalCardHeader}>
            <MaterialIcons
              name="account-balance-wallet"
              size={18}
              color="rgba(255,255,255,0.7)"
            />
            <Text
              style={[styles.capitalLabel, { color: "rgba(255,255,255,0.7)" }]}
            >
              Net Worth
            </Text>
          </View>
          <View style={styles.capitalValues}>
            <View style={styles.capitalValueRow}>
              <Text
                style={[
                  styles.capitalValueHint,
                  { color: "rgba(255,255,255,0.6)" },
                ]}
              >
                Invested
              </Text>
              <Text
                style={[
                  styles.capitalValueSmall,
                  { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                MVR{" "}
                {initialCapital.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View
              style={[styles.capitalValueRow, styles.capitalValueDivider]}
            />
            <View style={styles.capitalValueRow}>
              <Text
                style={[
                  styles.capitalValueHint,
                  { color: "rgba(255,255,255,0.6)" },
                ]}
              >
                {netProfit >= 0 ? "Profit" : "Loss"}
              </Text>
              <Text
                style={[
                  styles.capitalValueMain,
                  { color: remainingCapital >= 0 ? "#FFFFFF" : "#FCA5A5" },
                ]}
              >
                MVR{" "}
                {remainingCapital.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.capitalHint, { color: "rgba(255,255,255,0.5)" }]}
          >
            Invested + All-time profit
          </Text>
        </TouchableOpacity>
        <View
          style={[
            styles.capitalDecoration,
            { backgroundColor: "rgba(255,255,255,0.08)" },
          ]}
        />
      </View>

      {/* Business Switcher Modal */}
      <Modal
        visible={showBusinessDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBusinessDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.businessModalContent,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                Switch Business
              </Text>
              <TouchableOpacity onPress={() => setShowBusinessDropdown(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.secondary}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={businesses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.businessItem, { borderColor: colors.outline }]}
                  onPress={() => switchBusiness(item.id)}
                >
                  <View style={styles.businessItemInfo}>
                    <MaterialIcons
                      name={
                        item.id === currentBusinessId
                          ? "radio-button-checked"
                          : "radio-button-unchecked"
                      }
                      size={22}
                      color={
                        item.id === currentBusinessId
                          ? colors.primary
                          : colors.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.businessItemName,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {businesses.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleDeleteBusiness(item)}
                      style={styles.deleteBusinessBtn}
                    >
                      <MaterialIcons
                        name="delete"
                        size={20}
                        color={colors.tertiary}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={[
                    styles.addBusinessBtn,
                    { borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setShowBusinessDropdown(false);
                    setShowAddBusiness(true);
                  }}
                >
                  <MaterialIcons name="add" size={20} color={colors.primary} />
                  <Text
                    style={[styles.addBusinessText, { color: colors.primary }]}
                  >
                    Add New Business
                  </Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Add Business Modal */}
      <Modal
        visible={showAddBusiness}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddBusiness(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.capitalEditForm,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text
              style={[styles.capitalEditTitle, { color: colors.onSurface }]}
            >
              New Business
            </Text>
            <TextInput
              placeholder="Business name"
              placeholderTextColor={colors.outline}
              value={newBusinessName}
              onChangeText={setNewBusinessName}
              style={[
                styles.capitalEditInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  color: colors.onSurface,
                },
              ]}
              autoFocus
            />
            <View style={styles.capitalEditActions}>
              <TouchableOpacity
                style={[
                  styles.capitalEditBtn,
                  { backgroundColor: colors.outline },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowAddBusiness(false);
                  setNewBusinessName("");
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.capitalEditBtn,
                  { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.8}
                onPress={addNewBusiness}
              >
                <MaterialIcons name="check" size={18} color={colors.white} />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null); setDeleteInput(""); }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.capitalEditForm,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="warning" size={22} color={colors.tertiary} />
              <Text
                style={[styles.capitalEditTitle, { color: colors.tertiary }]}
              >
                Delete Business
              </Text>
            </View>
            <Text style={[styles.deleteWarningText, { color: colors.secondary }]}>
              Type <Text style={{ fontWeight: '700', color: colors.onSurface }}>{deleteTarget?.name}</Text> to confirm. All data will be permanently deleted.
            </Text>
            <TextInput
              placeholder="Type business name"
              placeholderTextColor={colors.outline}
              value={deleteInput}
              onChangeText={setDeleteInput}
              style={[
                styles.capitalEditInput,
                {
                  backgroundColor: deleteInput === deleteTarget?.name ? `${colors.tertiary}10` : colors.surfaceContainer,
                  borderColor: deleteInput === deleteTarget?.name ? colors.tertiary : 'transparent',
                  borderWidth: 1,
                  color: colors.onSurface,
                },
              ]}
              autoFocus
              autoComplete="off"
            />
            <View style={styles.capitalEditActions}>
              <TouchableOpacity
                style={[
                  styles.capitalEditBtn,
                  { backgroundColor: colors.outline },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                  setDeleteInput("");
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.capitalEditBtn,
                  { backgroundColor: deleteInput === deleteTarget?.name ? colors.tertiary : colors.outline },
                ]}
                activeOpacity={0.8}
                disabled={deleteInput !== deleteTarget?.name}
                onPress={confirmDeleteBusiness}
              >
                <MaterialIcons name="delete" size={18} color={deleteInput === deleteTarget?.name ? colors.white : colors.secondary} />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: deleteInput === deleteTarget?.name ? colors.white : colors.secondary }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hero Section */}
      <Card variant="primary" style={styles.heroCard}>
        <View style={styles.heroContent}>
          <TouchableOpacity
            style={[
              styles.heroBtn,
              {
                backgroundColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 3,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => router.push("/new-sale" as any)}
          >
            <MaterialIcons
              name="point-of-sale"
              size={18}
              color={colors.primaryDark}
            />
            <Text style={[styles.heroBtnText, { color: colors.primaryDark }]}>
              New Sale
            </Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.heroLabel}>Today&apos;s Sales</Text>
            <Text style={styles.heroAmount}>MVR {todayTotal.toFixed(2)}</Text>
            <View
              style={[
                styles.trendBadge,
                { backgroundColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              <MaterialIcons
                name="trending-up"
                size={14}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.trendText}>
                {totalTransactions} transactions
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.heroDecoration,
            { backgroundColor: "rgba(255,255,255,0.05)" },
          ]}
        />
      </Card>

      {/* Capital Edit Modal */}
      {showCapitalEdit && (
        <View style={styles.capitalEditOverlay}>
          <View
            style={[
              styles.capitalEditForm,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text
              style={[styles.capitalEditTitle, { color: colors.onSurface }]}
            >
              Edit Invested Capital
            </Text>
            <TextInput
              placeholder="Amount (MVR)"
              placeholderTextColor={colors.outline}
              value={capitalInput}
              onChangeText={setCapitalInput}
              keyboardType="decimal-pad"
              style={[
                styles.capitalEditInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  color: colors.onSurface,
                },
              ]}
              autoFocus
            />
            <View style={styles.capitalEditActions}>
              <TouchableOpacity
                style={[
                  styles.capitalEditBtn,
                  { backgroundColor: colors.outline },
                ]}
                activeOpacity={0.7}
                onPress={() => setShowCapitalEdit(false)}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.capitalEditBtn,
                  { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.8}
                onPress={saveCapital}
              >
                <MaterialIcons name="check" size={18} color={colors.white} />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Stats Grid - 2 columns */}
      <View style={styles.statsGrid}>
        {/* Sales Stats Card */}
        <TouchableOpacity
          style={[
            styles.statsCard,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: `${colors.outline}10`,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => router.push("/sales" as any)}
        >
          <View style={styles.statsCardHeader}>
            <MaterialIcons
              name="receipt-long"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.statsCardTitle, { color: colors.onSurface }]}>
              Sales
            </Text>
          </View>
          <Text style={[styles.statsCardValue, { color: colors.onSurface }]}>
            {totalTransactions}
          </Text>
          <Text style={[styles.statsCardSub, { color: colors.secondary }]}>
            Total transactions
          </Text>

          {/* Payment Breakdown */}
          <View style={styles.paymentBreakdown}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentItem}>
                <View style={[styles.paymentDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.paymentLabel, { color: colors.secondary }]}>Paid</Text>
                <Text style={[styles.paymentValue, { color: colors.onSurface }]}>
                  MVR {paidAmount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentItem}>
                <View style={[styles.paymentDot, { backgroundColor: colors.tertiary }]} />
                <Text style={[styles.paymentLabel, { color: colors.secondary }]}>Pending</Text>
                <Text style={[styles.paymentValue, { color: colors.onSurface }]}>
                  MVR {pendingAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text
            style={{ fontSize: 24, fontWeight: "800", color: colors.onSurface }}
          >
            Recent Activity
          </Text>
          <TouchableOpacity onPress={() => router.push("/sales" as any)}>
            <Text
              style={{ fontWeight: "700", color: colors.primary, fontSize: 14 }}
            >
              View All
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activityList}>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={{ fontSize: 16, color: colors.secondary }}>
                No activity yet
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyActivityBtn,
                  { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.8}
                onPress={() => router.push("/new-sale" as any)}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.white,
                  }}
                >
                  Make a new sale
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
    paddingHorizontal: 24,
    gap: 32,
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  heroBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  heroBtnText: {
    fontWeight: "700",
    fontSize: 9,
    textAlign: "center",
  },
  heroDecoration: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  capitalCardWrapper: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
    position: "relative",
    flexDirection: "column",
    gap: 12,
  },
  capitalCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  businessNameBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  businessNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
  capitalCardInner: {
    position: "relative",
    zIndex: 1,
  },
  settingsBtn: {
    padding: 6,
    position: "relative",
    zIndex: 1,
  },
  capitalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  capitalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  capitalValues: {
    width: "100%",
    gap: 4,
  },
  capitalValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  capitalValueHint: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  capitalValueSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  capitalValueMain: {
    fontSize: 28,
    fontWeight: "800",
  },
  capitalValueDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 8,
    paddingBottom: 8,
  },
  capitalHint: {
    fontSize: 11,
    marginTop: 12,
    color: "rgba(255,255,255,0.5)",
  },
  capitalDecoration: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -40,
    right: -40,
  },
  capitalEditOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  businessModalContent: {
    borderRadius: 20,
    width: "100%",
    maxHeight: "70%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  businessItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 12,
  },
  businessItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  businessItemName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  deleteBusinessBtn: {
    padding: 6,
  },
  addBusinessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  addBusinessText: {
    fontSize: 15,
    fontWeight: "600",
  },
  capitalEditForm: {
    borderRadius: 20,
    padding: 24,
    width: "85%",
    gap: 16,
  },
  capitalEditTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  deleteWarningText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  capitalEditInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  capitalEditActions: {
    flexDirection: "row",
    gap: 12,
  },
  capitalEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 0,
    gap: 8,
  },
  statsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statsCardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statsCardValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  statsCardSub: {
    fontSize: 12,
    marginTop: -4,
  },
  paymentBreakdown: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  paymentRow: {
    flexDirection: "row",
    gap: 16,
  },
  paymentItem: {
    flex: 1,
    gap: 4,
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  activitySection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  emptyActivity: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  emptyActivityBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
