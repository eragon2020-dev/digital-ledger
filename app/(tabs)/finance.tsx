import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StockStore } from "@/store/StockStore";
import { SaleRecord, ExpenseRecord, ExpenseType } from "@/types";
import { useToast } from "@/providers/ToastProvider";
import { IncomeRecord } from "@/store/StockStore";

type FinanceTab = "income" | "expense";

const EXPENSE_TYPES: { key: ExpenseType; label: string; icon: string }[] = [
  { key: "stock", label: "Stock", icon: "inventory-2" },
  { key: "rent", label: "Rent", icon: "home" },
  { key: "utilities", label: "Utilities", icon: "bolt" },
  { key: "transport", label: "Transport", icon: "local-shipping" },
  { key: "other", label: "Other", icon: "more-horiz" },
];

export default function FinanceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<FinanceTab>("income");
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseRecord[]>([]);
  const [filteredIncomes, setFilteredIncomes] = useState<IncomeRecord[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state for expenses
  const [expenseCursor, setExpenseCursor] = useState<string | undefined>(undefined);
  const [expenseHasMore, setExpenseHasMore] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [totalExpensesCount, setTotalExpensesCount] = useState(0);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(0);

  // Pagination state for income
  const [incomeCursor, setIncomeCursor] = useState<string | undefined>(undefined);
  const [incomeHasMore, setIncomeHasMore] = useState(true);
  const [loadingIncomes, setLoadingIncomes] = useState(false);
  const [totalIncomesCount, setTotalIncomesCount] = useState(0);

  // Date filters
  const [showFromDate, setShowFromDate] = useState<Date | null>(null);
  const [showToDate, setShowToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Add income form
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [manualIncomes, setManualIncomes] = useState<IncomeRecord[]>([]);

  // Expense form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<ExpenseType>("other");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const loadData = useCallback(async (reset = true) => {
    // Load sales data for income calculation (always fresh)
    const salesData = await StockStore.getSalesHistory();
    setSales(salesData);

    const now = new Date();
    const salesIncome = salesData
      .filter(
        (s) =>
          s.timestamp.getMonth() === now.getMonth() &&
          s.timestamp.getFullYear() === now.getFullYear(),
      )
      .reduce((sum, s) => sum + s.total, 0);

    // Load paginated expenses
    if (reset) {
      try {
        const options: any = {
          limit: 50,
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        };
        if (!reset && expenseCursor) options.cursor = expenseCursor;

        const result = await StockStore.getPaginatedExpenses(options);
        const count = await StockStore.getExpenseCount({
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        });
        setTotalExpensesCount(count);

        // Aggregate total expenses amount
        const totalAmount = result.data.reduce((sum, e) => sum + e.amount, 0);
        setTotalExpensesAmount(totalAmount);

        setExpenses(result.data);
        setFilteredExpenses(result.data);

        setExpenseCursor(result.cursor);
        setExpenseHasMore(result.hasNextPage);
      } catch (error) {
        console.error("Error loading expenses:", error);
      }
    } else if (activeTab === "expense") {
      try {
        const options: any = {
          limit: 50,
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        };
        if (expenseCursor) options.cursor = expenseCursor;

        const result = await StockStore.getPaginatedExpenses(options);
        const count = await StockStore.getExpenseCount({
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        });
        setTotalExpensesCount(count);

        setExpenses((prev) => [...prev, ...result.data]);
        setFilteredExpenses((prev) => [...prev, ...result.data]);
        setExpenseCursor(result.cursor);
        setExpenseHasMore(result.hasNextPage);
      } catch (error) {
        console.error("Error loading more expenses:", error);
      }
    }

    // Load paginated incomes
    if (reset) {
      try {
        const options: any = {
          limit: 50,
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        };

        const result = await StockStore.getPaginatedIncomes(options);
        const count = await StockStore.getIncomeCount({
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        });
        setTotalIncomesCount(count);

        const manualIncomes = result.data;
        setManualIncomes(manualIncomes);

        const manualIncome = manualIncomes
          .filter(
            (i) =>
              i.timestamp.getMonth() === now.getMonth() &&
              i.timestamp.getFullYear() === now.getFullYear(),
          )
          .reduce((sum, i) => sum + i.amount, 0);
        setMonthlyIncome(salesIncome + manualIncome);

        setFilteredIncomes(manualIncomes);
        setIncomeCursor(result.cursor);
        setIncomeHasMore(result.hasNextPage);
      } catch (error) {
        console.error("Error loading incomes:", error);
      }
    } else if (activeTab === "income") {
      try {
        const options: any = {
          limit: 50,
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        };
        if (incomeCursor) options.cursor = incomeCursor;

        const result = await StockStore.getPaginatedIncomes(options);
        const count = await StockStore.getIncomeCount({
          fromDate: showFromDate || undefined,
          toDate: showToDate || undefined,
        });
        setTotalIncomesCount(count);

        const manualIncomes = result.data;
        setManualIncomes(manualIncomes);
        setFilteredIncomes(manualIncomes);
        setIncomeCursor(result.cursor);
        setIncomeHasMore(result.hasNextPage);
      } catch (error) {
        console.error("Error loading more incomes:", error);
      }
    }
  }, [activeTab, showFromDate, showToDate, expenseCursor, incomeCursor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus (e.g., after adding inventory)
  useFocusEffect(
    useCallback(() => {
      // Reset pagination and reload
      setExpenseCursor(undefined);
      setIncomeCursor(undefined);
      setExpenseHasMore(true);
      setIncomeHasMore(true);
      loadData(true);
    }, [loadData])
  );

  const loadMoreExpenses = useCallback(async () => {
    if (!expenseHasMore || loadingExpenses) return;
    setLoadingExpenses(true);
    await loadData(false);
    setLoadingExpenses(false);
  }, [expenseHasMore, loadingExpenses, loadData]);

  const loadMoreIncomes = useCallback(async () => {
    if (!incomeHasMore || loadingIncomes) return;
    setLoadingIncomes(true);
    await loadData(false);
    setLoadingIncomes(false);
  }, [incomeHasMore, loadingIncomes, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const applyDateFilter = useCallback(() => {
    setExpenseCursor(undefined);
    setIncomeCursor(undefined);
    setExpenseHasMore(true);
    setIncomeHasMore(true);
    loadData(true);
  }, [loadData]);

  const clearDateFilter = () => {
    setShowFromDate(null);
    setShowToDate(null);
    setShowFromPicker(false);
    setShowToPicker(false);
    setExpenseCursor(undefined);
    setIncomeCursor(undefined);
    setExpenseHasMore(true);
    setIncomeHasMore(true);
    setShowDateFilter(false);
    loadData(true);
  };

  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromPicker(Platform.OS === "ios");
    if (selectedDate) {
      setShowFromDate(selectedDate);
      setTimeout(applyDateFilter, 100);
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToPicker(Platform.OS === "ios");
    if (selectedDate) {
      setShowToDate(selectedDate);
      setTimeout(applyDateFilter, 100);
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

  const openAddForm = () => {
    setFormTitle("");
    setFormAmount("");
    setFormType("other");
    setShowAddForm(true);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setFormTitle("");
    setFormAmount("");
    setFormType("other");
    setEditingExpenseId(null);
  };

  const submitIncome = async () => {
    const title = incomeTitle.trim();
    const amount = parseFloat(incomeAmount);
    if (!title) {
      Alert.alert("Error", "Title is required");
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Amount is required");
      return;
    }

    try {
      if (editingIncomeId) {
        await StockStore.updateIncome(editingIncomeId, { title, amount, timestamp: new Date() });
        setEditingIncomeId(null);
      } else {
        await StockStore.addIncome({ title, amount, timestamp: new Date() });
      }
      setIncomeTitle("");
      setIncomeAmount("");
      setShowIncomeForm(false);
      loadData();
    } catch (error: any) {
      Alert.alert(
        "Error",
        "Failed to add income: " + (error?.message || "Unknown error"),
      );
    }
  };

  const submitExpense = async () => {
    const title = formTitle.trim();
    const amount = parseFloat(formAmount);
    if (!title) {
      Alert.alert("Error", "Title is required");
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Amount is required");
      return;
    }

    try {
      if (editingExpenseId) {
        await StockStore.updateExpense(editingExpenseId, {
          title,
          amount,
          expenseType: formType,
          timestamp: new Date(),
        });
        setEditingExpenseId(null);
      } else {
        await StockStore.addExpense({
          title,
          amount,
          expenseType: formType,
          timestamp: new Date(),
        });
      }
      closeForm();
      loadData();
    } catch (error: any) {
      Alert.alert(
        "Error",
        "Failed to add expense: " + (error?.message || "Unknown error"),
      );
    }
  };

  const deleteExpense = async (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    await StockStore.deleteExpense(id);
    loadData();
    showToast({
      message: `"${exp.title}" deleted`,
      actionLabel: "Undo",
      duration: 3000,
      onAction: async () => {
        await StockStore.addExpense({
          title: exp.title,
          amount: exp.amount,
          expenseType: exp.expenseType,
          timestamp: exp.timestamp,
        });
        loadData();
      },
    });
  };

  const editExpense = async (exp: ExpenseRecord) => {
    setFormTitle(exp.title);
    setFormAmount(String(exp.amount));
    setFormType(exp.expenseType);
    setEditingExpenseId(exp.id);
    setShowAddForm(true);
  };

  const deleteIncome = async (id: string) => {
    const inc = manualIncomes.find((i) => i.id === id);
    if (!inc) return;
    await StockStore.deleteIncome(id);
    setManualIncomes(prev => prev.filter(i => i.id !== id));
    setFilteredIncomes(prev => prev.filter(i => i.id !== id));
    showToast({
      message: `"${inc.title}" deleted`,
      actionLabel: "Undo",
      duration: 3000,
      onAction: async () => {
        await StockStore.addIncome({
          title: inc.title,
          amount: inc.amount,
          timestamp: inc.timestamp,
        });
        loadData();
      },
    });
  };

  const editIncome = async (income: IncomeRecord) => {
    setIncomeTitle(income.title);
    setIncomeAmount(String(income.amount));
    setEditingIncomeId(income.id);
    setShowIncomeForm(true);
  };

  const formatCurrency = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const getExpenseTypeLabel = (t: ExpenseType) =>
    EXPENSE_TYPES.find((e) => e.key === t)?.label || t;
  const getExpenseTypeIcon = (t: ExpenseType) =>
    EXPENSE_TYPES.find((e) => e.key === t)?.icon || "receipt";

  const totalExpenses = totalExpensesAmount;
  const profit = monthlyIncome - totalExpenses;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surfaceContainerLowest,
            paddingTop: 8,
            borderBottomColor: `${colors.outline}15`,
          },
        ]}
      >
        {[
          { key: "income" as FinanceTab, label: "Income", icon: "trending-up" },
          {
            key: "expense" as FinanceTab,
            label: "Expenses",
            icon: "trending-down",
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === tab.key ? colors.primary : "transparent",
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.white : colors.secondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab.key ? colors.white : colors.secondary,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ===== INCOME TAB ===== */}
        {activeTab === "income" && (
          <>
            {/* Income Header Card */}
            <View
              style={[
                styles.financeHeaderCard,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <View style={[styles.financeDecoration, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={[styles.financeDecoration2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
              <View style={styles.financeHeaderTitleRow}>
                <View style={styles.financeTitleSection}>
                  <Text style={styles.financeHeaderTitle}>Income</Text>
                  <Text style={styles.financeHeaderSubtitle}>
                    {filteredIncomes.length} records
                  </Text>
                </View>
                <View style={styles.financeHeaderTotal}>
                  <Text style={styles.financeHeaderTotalLabel}>Total</Text>
                  <Text style={styles.financeHeaderTotalValue}>
                    MVR {formatCurrency(monthlyIncome)}
                  </Text>
                </View>
              </View>
              <View style={styles.financeHeaderActions}>
                <TouchableOpacity
                  style={[
                    styles.financeHeaderActionBtn,
                    { backgroundColor: "rgba(255,255,255,0.15)" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setShowDateFilter(!showDateFilter)}
                >
                  <MaterialIcons
                    name="date-range"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.financeHeaderActionBtn,
                    { backgroundColor: "#FFFFFF" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setShowIncomeForm(true)}
                >
                  <MaterialIcons name="add" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Filter Card */}
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
                <View style={styles.datePickerRow}>
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
                      <Text
                        style={[
                          styles.datePickerLabel,
                          { color: colors.secondary },
                        ]}
                      >
                        From
                      </Text>
                      <Text
                        style={[
                          styles.datePickerValue,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDateForDisplay(showFromDate)}
                      </Text>
                    </TouchableOpacity>
                    {showFromPicker && (
                      <DateTimePicker
                        value={showFromDate || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleFromDateChange}
                        textColor={colors.onSurface}
                      />
                    )}
                  </View>
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
                      <Text
                        style={[
                          styles.datePickerLabel,
                          { color: colors.secondary },
                        ]}
                      >
                        To
                      </Text>
                      <Text
                        style={[
                          styles.datePickerValue,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDateForDisplay(showToDate)}
                      </Text>
                    </TouchableOpacity>
                    {showToPicker && (
                      <DateTimePicker
                        value={showToDate || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleToDateChange}
                        textColor={colors.onSurface}
                      />
                    )}
                  </View>
                </View>
                <View style={styles.dateFilterBtns}>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterBtn,
                      { backgroundColor: colors.outline },
                    ]}
                    onPress={clearDateFilter}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={applyDateFilter}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Apply
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Income Form */}
            {showIncomeForm && (
              <View
                style={[
                  styles.form,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: `${colors.primary}30`,
                  },
                ]}
              >
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: colors.onSurface }]}>
                    New Income
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowIncomeForm(false)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={colors.outline}
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  placeholder="Title"
                  placeholderTextColor={colors.outline}
                  value={incomeTitle}
                  onChangeText={setIncomeTitle}
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.onSurface,
                    },
                  ]}
                />
                <TextInput
                  placeholder="Amount (MVR)"
                  placeholderTextColor={colors.outline}
                  value={incomeAmount}
                  onChangeText={setIncomeAmount}
                  keyboardType="decimal-pad"
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.onSurface,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  activeOpacity={0.8}
                  onPress={submitIncome}
                >
                  <MaterialIcons name="check" size={18} color={colors.white} />
                  <Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Incomes List */}
            <View
              style={[
                styles.listCard,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: `${colors.outline}10`,
                },
              ]}
            >
              <View style={styles.listCardHeader}>
                <Text style={[styles.listTitle, { color: colors.onSurface }]}>
                  Incomes
                </Text>
                <Text style={[styles.listCount, { color: colors.outline }]}>
                  {sales.length + filteredIncomes.length}
                </Text>
              </View>
              {sales.length === 0 && filteredIncomes.length === 0 ? (
                <View style={styles.emptyList}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={48}
                    color={colors.outline}
                  />
                  <Text style={[styles.emptyText, { color: colors.secondary }]}>
                    No Incomes Yet
                  </Text>
                </View>
              ) : (
                <>
                  {/* Manual Incomes */}
                  {filteredIncomes.map((income) => (
                    <View key={income.id} style={[styles.saleRow, { borderBottomWidth: 1, borderBottomColor: `${colors.outline}10`, paddingVertical: 14 }]}>
                      <View style={styles.saleRowLeft}>
                        <View
                          style={[
                            styles.saleIcon,
                            { backgroundColor: `${colors.primary}15` },
                          ]}
                        >
                          <MaterialIcons
                            name="payments"
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.saleRowTitle,
                                { color: colors.onSurface },
                              ]}
                            >
                              {income.title}
                            </Text>
                            <View style={[styles.sourceBadge, { backgroundColor: `${colors.primary}20` }]}>
                              <Text style={[styles.sourceBadgeText, { color: colors.primary }]}>Manual</Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.saleRowSub,
                              { color: colors.secondary },
                            ]}
                          >
                            {formatDate(income.timestamp)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text
                          style={[
                            styles.saleRowAmount,
                            { color: colors.primary },
                          ]}
                        >
                          +MVR {formatCurrency(income.amount)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity onPress={() => editIncome(income)}>
                            <MaterialIcons name="edit" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteIncome(income.id)}>
                            <MaterialIcons name="delete" size={16} color={colors.tertiary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  {/* Sales */}
                  {sales.map((sale) => (
                    <View key={sale.id} style={[styles.saleRow, { borderBottomWidth: 1, borderBottomColor: `${colors.outline}10`, paddingVertical: 14 }]}>
                      <View style={styles.saleRowLeft}>
                        <View
                          style={[
                            styles.saleIcon,
                            { backgroundColor: `${colors.primary}15` },
                          ]}
                        >
                          <MaterialIcons
                            name="shopping-bag"
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.saleRowTitle,
                                { color: colors.onSurface },
                              ]}
                            >
                              Sale {sale.id}
                            </Text>
                            <View style={[styles.sourceBadge, { backgroundColor: `${colors.secondary}15` }]}>
                              <Text style={[styles.sourceBadgeText, { color: colors.secondary }]}>Sale</Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.saleRowSub,
                              { color: colors.secondary },
                            ]}
                          >
                            {sale.items.length} Items •{" "}
                            {sale.paymentMethod === "cash"
                              ? "Cash"
                              : sale.paymentMethod === "transfer"
                                ? "Transfer"
                                : "Credit"}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            styles.saleRowAmount,
                            { color: colors.primary },
                          ]}
                        >
                          +MVR {formatCurrency(sale.total)}
                        </Text>
                        <Text
                          style={[styles.saleRowDate, { color: colors.outline }]}
                        >
                          {formatDate(sale.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {/* ===== EXPENSE TAB ===== */}
        {activeTab === "expense" && (
          <>
            {/* Expense Header Card */}
            <View
              style={[
                styles.financeHeaderCard,
                { backgroundColor: colors.tertiary },
              ]}
            >
              <View style={[styles.financeDecoration, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={[styles.financeDecoration2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
              <View style={styles.financeHeaderTitleRow}>
                <View style={styles.financeTitleSection}>
                  <Text style={styles.financeHeaderTitle}>Expenses</Text>
                  <Text style={styles.financeHeaderSubtitle}>
                    {filteredExpenses.length} records
                  </Text>
                </View>
                <View style={styles.financeHeaderTotal}>
                  <Text style={styles.financeHeaderTotalLabel}>Total</Text>
                  <Text style={styles.financeHeaderTotalValue}>
                    MVR {formatCurrency(totalExpenses)}
                  </Text>
                </View>
              </View>
              <View style={styles.financeHeaderActions}>
                <TouchableOpacity
                  style={[
                    styles.financeHeaderActionBtn,
                    { backgroundColor: "rgba(255,255,255,0.15)" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setShowDateFilter(!showDateFilter)}
                >
                  <MaterialIcons name="date-range" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.financeHeaderActionBtn,
                    { backgroundColor: "#FFFFFF" },
                  ]}
                  activeOpacity={0.7}
                  onPress={openAddForm}
                >
                  <MaterialIcons name="add" size={18} color={colors.tertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Filter Card */}
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
                <View style={styles.datePickerRow}>
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
                      <Text
                        style={[
                          styles.datePickerLabel,
                          { color: colors.secondary },
                        ]}
                      >
                        From
                      </Text>
                      <Text
                        style={[
                          styles.datePickerValue,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDateForDisplay(showFromDate)}
                      </Text>
                    </TouchableOpacity>
                    {showFromPicker && (
                      <DateTimePicker
                        value={showFromDate || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleFromDateChange}
                        textColor={colors.onSurface}
                      />
                    )}
                  </View>
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
                      <Text
                        style={[
                          styles.datePickerLabel,
                          { color: colors.secondary },
                        ]}
                      >
                        To
                      </Text>
                      <Text
                        style={[
                          styles.datePickerValue,
                          { color: colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDateForDisplay(showToDate)}
                      </Text>
                    </TouchableOpacity>
                    {showToPicker && (
                      <DateTimePicker
                        value={showToDate || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleToDateChange}
                        textColor={colors.onSurface}
                      />
                    )}
                  </View>
                </View>
                <View style={styles.dateFilterBtns}>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterBtn,
                      { backgroundColor: colors.outline },
                    ]}
                    onPress={clearDateFilter}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dateFilterBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={applyDateFilter}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Apply
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Inline Form */}
            {showAddForm && (
              <View
                style={[
                  styles.form,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: `${colors.tertiary}30`,
                  },
                ]}
              >
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: colors.onSurface }]}>
                    New Expense
                  </Text>
                  <TouchableOpacity onPress={closeForm} activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={colors.outline}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.typeRow}>
                  {EXPENSE_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor:
                            formType === t.key
                              ? colors.tertiary
                              : colors.surfaceContainer,
                        },
                      ]}
                      onPress={() => setFormType(t.key)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={t.icon as any}
                        size={14}
                        color={
                          formType === t.key ? colors.white : colors.secondary
                        }
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color:
                              formType === t.key
                                ? colors.white
                                : colors.secondary,
                          },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  placeholder="Title"
                  placeholderTextColor={colors.outline}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.onSurface,
                    },
                  ]}
                />
                <TextInput
                  placeholder="Amount (MVR)"
                  placeholderTextColor={colors.outline}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  keyboardType="decimal-pad"
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.onSurface,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: colors.tertiary },
                  ]}
                  activeOpacity={0.8}
                  onPress={submitExpense}
                >
                  <MaterialIcons name="check" size={18} color={colors.white} />
                  <Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Expense List */}
            <View
              style={[
                styles.listCard,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: `${colors.outline}10`,
                },
              ]}
            >
              <View style={styles.listCardHeader}>
                <Text style={[styles.listTitle, { color: colors.onSurface }]}>
                  Expenses
                </Text>
                <Text style={[styles.listCount, { color: colors.outline }]}>
                  {totalExpensesCount} records
                </Text>
              </View>
              {filteredExpenses.length === 0 ? (
                <View style={styles.emptyList}>
                  <MaterialIcons
                    name="money-off"
                    size={48}
                    color={colors.outline}
                  />
                  <Text style={[styles.emptyText, { color: colors.secondary }]}>
                    No Expenses Yet
                  </Text>
                </View>
              ) : (
                <>
                  {/* All Expenses (Stock + Manual) */}
                  {filteredExpenses.map((exp) => (
                    <View
                      key={exp.id}
                      style={[
                        styles.saleRow,
                        { borderBottomWidth: 1, borderBottomColor: `${colors.outline}10`, paddingVertical: 14 },
                      ]}
                    >
                      <View style={styles.saleRowLeft}>
                        <View
                          style={[
                            styles.saleIcon,
                            { backgroundColor: `${colors.tertiary}15` },
                          ]}
                        >
                          <MaterialIcons
                            name={exp.expenseType === "stock" ? "inventory-2" : "trending-down"}
                            size={20}
                            color={colors.tertiary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.saleRowTitle,
                                { color: colors.onSurface },
                              ]}
                            >
                              {exp.title}
                            </Text>
                            <View style={[styles.sourceBadge, { backgroundColor: `${colors.tertiary}15` }]}>
                              <Text style={[styles.sourceBadgeText, { color: colors.tertiary }]}>
                                {exp.expenseType === "stock" ? "Stock" : "Manual"}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.saleRowSub,
                              { color: colors.secondary },
                            ]}
                          >
                            {formatDate(exp.timestamp)} ·{" "}
                            {getExpenseTypeLabel(exp.expenseType)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text
                          style={[
                            styles.saleRowAmount,
                            { color: colors.tertiary },
                          ]}
                        >
                          -MVR {formatCurrency(exp.amount)}
                        </Text>
                        <Text
                          style={[styles.saleRowDate, { color: colors.outline }]}
                        >
                          {formatDate(exp.timestamp)}
                        </Text>
                        {/* Edit/Delete only for manual expenses */}
                        {exp.expenseType !== "stock" && (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => editExpense(exp)}>
                              <MaterialIcons name="edit" size={16} color={colors.secondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteExpense(exp.id)}>
                              <MaterialIcons name="delete" size={16} color={colors.tertiary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  financeHeaderCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
  },
  financeDecoration: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -20,
    right: -10,
  },
  financeDecoration2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: -15,
    left: 20,
  },
  financeHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  financeTitleSection: { flex: 1 },
  financeHeaderTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  financeHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  financeHeaderTotal: { alignItems: "flex-end" },
  financeHeaderTotalLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  financeHeaderTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  financeHeaderActions: { flexDirection: "row", gap: 8 },
  financeHeaderActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  dateFilterCard: { borderRadius: 16, padding: 14, borderWidth: 1 },
  dateFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dateFilterTitle: { fontSize: 13, fontWeight: "700" },
  dateFilterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateFilterToggleText: { fontSize: 12, fontWeight: "600" },
  datePickerRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  datePickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  datePickerLabel: { fontSize: 10, fontWeight: "600" },
  datePickerValue: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  clearFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dateFilterBtns: { flexDirection: "row", gap: 8, marginTop: 10 },
  dateFilterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cardsRow: { gap: 12 },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 130,
    justifyContent: "space-between",
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },
  summaryCardValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 6,
  },
  listCard: { borderRadius: 24, padding: 20, borderWidth: 1 },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  listTitle: { fontSize: 18, fontWeight: "700" },
  listCount: { fontSize: 13, fontWeight: "500" },
  emptyList: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15 },
  saleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  saleRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  saleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saleRowTitle: { fontSize: 14, fontWeight: "600" },
  saleRowSub: { fontSize: 12, marginTop: 2 },
  saleRowAmount: { fontSize: 15, fontWeight: "700" },
  saleRowDate: { fontSize: 11, marginTop: 2 },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: { fontSize: 9, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  form: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: { fontSize: 16, fontWeight: "700" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  typeChipText: { fontSize: 11, fontWeight: "600" },
  formInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  submitBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderRadius: 12,
  },
  expenseCardAccent: {
    width: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseDot: { width: 8, height: 8, borderRadius: 4 },
  expenseCardInfo: { flex: 1 },
  expenseCardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  expenseActionBtn: { padding: 4 },
  expenseCardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  expenseCardMeta: { fontSize: 11, lineHeight: 14 },
  expenseCardAmount: { fontSize: 15, fontWeight: "700" },
});
