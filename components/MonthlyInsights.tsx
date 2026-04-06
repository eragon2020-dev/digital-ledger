import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MonthlyAnalysis, BusinessInsight, ActionItem } from '@/types';

interface MonthlyInsightsProps {
  analysis: MonthlyAnalysis;
}

type TabKey = 'performance' | 'products' | 'expenses' | 'actions';

const PRIORITY_COLORS: Record<string, string> = {
  success: '#22C55E',
  info: '#0EA5E9',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const PRIORITY_ICONS: Record<string, string> = {
  success: 'check-circle',
  info: 'info',
  warning: 'warning',
  danger: 'error',
};

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'performance', label: 'Overview', icon: 'insights' },
  { key: 'products', label: 'Products', icon: 'inventory-2' },
  { key: 'expenses', label: 'Expenses', icon: 'account-balance-wallet' },
  { key: 'actions', label: 'Actions', icon: 'checklist' },
];

export function MonthlyInsights({ analysis }: MonthlyInsightsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabKey>('performance');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Group insights by category
  const grouped = useMemo(() => {
    const performance = analysis.insights.filter(i => i.type === 'performance');
    const products = analysis.insights.filter(i =>
      ['topProduct', 'deadStock', 'marginCrash', 'lowSeller'].includes(i.type)
    );
    const expenses = analysis.insights.filter(i => i.type === 'expenseAnomaly');
    const forecast = analysis.insights.filter(i => i.type === 'forecast');

    return { performance, products, expenses, forecast };
  }, [analysis]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const growthIcon = analysis.revenueGrowthPct >= 0 ? 'trending-up' : 'trending-down';
  const growthColor = analysis.revenueGrowthPct >= 0 ? PRIORITY_COLORS.success : PRIORITY_COLORS.danger;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLowest, borderColor: `${colors.outline}10` }]}>
      {/* Status Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: PRIORITY_COLORS[analysis.status] }]} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.onSurface }]}>
              Monthly Business Analysis
            </Text>
            <View style={styles.headerStats}>
              <MaterialIcons name={growthIcon} size={14} color={growthColor} />
              <Text numberOfLines={1} style={[styles.headerStat, { color: growthColor }]}>
                {analysis.revenueGrowthPct >= 0 ? '+' : ''}{analysis.revenueGrowthPct.toFixed(0)}%
              </Text>
              <Text style={[styles.headerStat, { color: colors.outline }]}>•</Text>
              <Text numberOfLines={1} style={[styles.headerStat, { color: colors.secondary }]}>
                {analysis.actions.length} actions
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map(tab => {
          const count = tab.key === 'actions'
            ? analysis.actions.length
            : grouped[tab.key]?.length || 0;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, {
                backgroundColor: isActive ? colors.primary : 'transparent',
              }]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={16}
                color={isActive ? '#FFFFFF' : colors.secondary}
              />
              <Text numberOfLines={1} style={[styles.tabLabel, { color: isActive ? '#FFFFFF' : colors.secondary }]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, {
                  backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${colors.outline}20`,
                }]}>
                  <Text style={[styles.tabBadgeText, {
                    color: isActive ? '#FFFFFF' : colors.secondary,
                  }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'performance' && (
          <PerformanceTab
            performance={grouped.performance}
            forecast={grouped.forecast}
            analysis={analysis}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            colors={colors}
          />
        )}
        {activeTab === 'products' && (
          <ProductsTab
            products={grouped.products}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            colors={colors}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={grouped.expenses}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            colors={colors}
          />
        )}
        {activeTab === 'actions' && (
          <ActionsTab actions={analysis.actions} colors={colors} />
        )}
      </View>
    </View>
  );
}

// ========== PERFORMANCE TAB ==========

function PerformanceTab({ performance, forecast, analysis, expandedItems, toggleExpand, colors }: any) {
  return (
    <View style={styles.tabContent}>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Revenue</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: colors.onSurface }]}>
            MVR {analysis.projectedRevenue.high.toFixed(0)}
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: `${PRIORITY_COLORS[analysis.status]}10` }]}>
          <Text numberOfLines={1} style={[styles.statLabel, { color: colors.secondary }]}>Status</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDotSmall, { backgroundColor: PRIORITY_COLORS[analysis.status] }]} />
            <Text numberOfLines={1} style={[styles.statusText, { color: PRIORITY_COLORS[analysis.status] }]}>
              {analysis.status === 'green' ? 'Healthy' : analysis.status === 'yellow' ? 'Caution' : 'At Risk'}
            </Text>
          </View>
        </View>
      </View>

      {/* Insights */}
      {[...performance, ...forecast].map((insight: BusinessInsight, i: number) => (
        <InsightRow
          key={`perf-${i}`}
          insight={insight}
          isExpanded={expandedItems.has(`perf-${i}`)}
          onToggle={() => toggleExpand(`perf-${i}`)}
          colors={colors}
        />
      ))}

      {/* Forecast Box */}
      <View style={[styles.forecastBox, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.outline}10` }]}>
        <MaterialIcons name="trending-up" size={18} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.forecastTitle, { color: colors.onSurface }]}>
            Next Month Forecast
          </Text>
          <Text style={[styles.forecastText, { color: colors.secondary }]}>
            Revenue: MVR {analysis.projectedRevenue.low.toFixed(0)} – {analysis.projectedRevenue.high.toFixed(0)}
            {'\n'}Capital projection: MVR {analysis.capitalProjection.toFixed(0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ========== PRODUCTS TAB ==========

function ProductsTab({ products, expandedItems, toggleExpand, colors }: any) {
  const [showAll, setShowAll] = useState(false);

  const critical = products.filter((p: any) => p.priority === 'danger');
  const warnings = products.filter((p: any) => p.priority === 'warning');
  const success = products.filter((p: any) => p.priority === 'success');

  const displayCritical = showAll ? critical : critical.slice(0, 3);
  const displayWarnings = showAll ? warnings : warnings.slice(0, 3);
  const displaySuccess = showAll ? success : success.slice(0, 2);

  const hasMore = products.length > displayCritical.length + displayWarnings.length + displaySuccess.length;

  return (
    <View style={styles.tabContent}>
      {displaySuccess.map((insight: BusinessInsight, i: number) => (
        <InsightRow
          key={`prod-s-${i}`}
          insight={insight}
          isExpanded={expandedItems.has(`prod-s-${i}`)}
          onToggle={() => toggleExpand(`prod-s-${i}`)}
          colors={colors}
        />
      ))}
      {displayWarnings.map((insight: BusinessInsight, i: number) => (
        <InsightRow
          key={`prod-w-${i}`}
          insight={insight}
          isExpanded={expandedItems.has(`prod-w-${i}`)}
          onToggle={() => toggleExpand(`prod-w-${i}`)}
          colors={colors}
        />
      ))}
      {displayCritical.map((insight: BusinessInsight, i: number) => (
        <InsightRow
          key={`prod-c-${i}`}
          insight={insight}
          isExpanded={expandedItems.has(`prod-c-${i}`)}
          onToggle={() => toggleExpand(`prod-c-${i}`)}
          colors={colors}
        />
      ))}
      {hasMore && (
        <TouchableOpacity
          style={styles.seeAllBtn}
          activeOpacity={0.7}
          onPress={() => setShowAll(!showAll)}
        >
          <MaterialIcons name={showAll ? 'expand-less' : 'arrow-forward'} size={16} color={colors.primary} />
          <Text style={[styles.seeAllText, { color: colors.primary }]}>
            {showAll ? 'Show less' : `See all ${products.length} product insights`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ========== EXPENSES TAB ==========

function ExpensesTab({ expenses, expandedItems, toggleExpand, colors }: any) {
  if (expenses.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyTab]}>
        <MaterialIcons name="check-circle" size={40} color={PRIORITY_COLORS.success} />
        <Text numberOfLines={3} style={[styles.emptyText, { color: colors.secondary }]}>
          No spending anomalies detected.{'\n'}All expenses are within normal range.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {expenses.map((insight: BusinessInsight, i: number) => (
        <InsightRow
          key={`exp-${i}`}
          insight={insight}
          isExpanded={expandedItems.has(`exp-${i}`)}
          onToggle={() => toggleExpand(`exp-${i}`)}
          colors={colors}
        />
      ))}
    </View>
  );
}

// ========== ACTIONS TAB ==========

function ActionsTab({ actions, colors }: { actions: ActionItem[]; colors: any }) {
  const actionIcons: Record<string, string> = {
    reorder: 'shopping-cart',
    'follow-up': 'phone',
    'price-review': 'edit',
    clearance: 'local-offer',
    promotion: 'campaign',
  };

  const typeColors: Record<string, string> = {
    reorder: '#0EA5E9',
    'follow-up': '#F59E0B',
    'price-review': '#EF4444',
    clearance: '#8B5CF6',
    promotion: '#22C55E',
  };

  return (
    <View style={styles.tabContent}>
      {actions.length === 0 ? (
        <View style={[styles.tabContent, styles.emptyTab]}>
          <MaterialIcons name="check-circle" size={40} color={PRIORITY_COLORS.success} />
          <Text numberOfLines={3} style={[styles.emptyText, { color: colors.secondary }]}>
            No urgent actions needed.{'\n'}Your business is running smoothly.
          </Text>
        </View>
      ) : (
        actions.map((action, i) => (
          <View key={action.id} style={[styles.actionCard, { backgroundColor: colors.surfaceContainer }]}>
            <View style={[styles.actionNumber, { backgroundColor: `${typeColors[action.type]}15` }]}>
              <Text style={[styles.actionNumberText, { color: typeColors[action.type] }]}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.actionContent}>
              <View style={styles.actionTitleRow}>
                <MaterialIcons name={actionIcons[action.type] || 'task' as any} size={16} color={typeColors[action.type]} />
                <Text numberOfLines={1} style={[styles.actionTitle, { color: colors.onSurface }]}>
                  {action.title}
                </Text>
              </View>
              <Text style={[styles.actionDetail, { color: colors.secondary }]}>
                {action.detail}
              </Text>
              <View style={[styles.actionSuggestion, { backgroundColor: `${typeColors[action.type]}10` }]}>
                <MaterialIcons name="lightbulb" size={12} color={typeColors[action.type]} />
                <Text style={[styles.actionSuggestionText, { color: typeColors[action.type] }]}>
                  {action.suggestion}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ========== SHARED COMPONENTS ==========

function InsightRow({ insight, isExpanded, onToggle, colors }: {
  insight: BusinessInsight;
  isExpanded: boolean;
  onToggle: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.insightCard, { borderColor: `${colors.outline}10`, backgroundColor: `${PRIORITY_COLORS[insight.priority]}05` }]}
      activeOpacity={0.7}
      onPress={onToggle}
    >
      <View style={styles.insightHeader}>
        <MaterialIcons
          name={PRIORITY_ICONS[insight.priority] as any}
          size={18}
          color={PRIORITY_COLORS[insight.priority]}
        />
        <Text numberOfLines={1} style={[styles.insightTitle, { color: colors.onSurface, flex: 1, marginLeft: 8 }]}>
          {insight.title}
        </Text>
        <MaterialIcons
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={colors.outline}
        />
      </View>
      {isExpanded && (
        <View style={styles.insightBody}>
          <Text style={[styles.insightDetail, { color: colors.secondary }]}>
            {insight.detail}
          </Text>
          {insight.suggestion && (
            <View style={[styles.suggestionBox, { backgroundColor: `${colors.primary}10` }]}>
              <MaterialIcons name="lightbulb" size={14} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.primary }]}>
                {insight.suggestion}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ========== STYLES ==========

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerStat: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabContent: {
    gap: 10,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forecastBox: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  forecastTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  forecastText: {
    fontSize: 12,
    lineHeight: 18,
  },
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  insightBody: {
    marginTop: 8,
    gap: 8,
  },
  insightDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionContent: {
    flex: 1,
    gap: 6,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
  actionSuggestionText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
