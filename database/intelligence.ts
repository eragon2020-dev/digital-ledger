/**
 * Monthly Business Analysis Engine
 * Rule-based intelligence that generates actionable insights
 */

import { getDb } from './database-instance';
import { getSalesAnalytics } from './analytics';
import { BusinessInsight, ActionItem, MonthlyAnalysis } from '@/types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Generate comprehensive monthly business analysis
 */
export async function generateMonthlyAnalysis(
  businessId: string,
  year: number,
  month: number
): Promise<MonthlyAnalysis> {
  const insights: BusinessInsight[] = [];
  const actions: ActionItem[] = [];

  // Gather all data in parallel
  const [
    thisMonthRevenue,
    lastMonthRevenue,
    threeMonthRevenue,
    thisMonthExpenses,
    lastMonthExpenses,
    thisMonthIncome,
    products,
    monthlyStockCost,
    capital,
    unpaidSales,
  ] = await Promise.all([
    getMonthlyTotal(businessId, year, month),
    getPrevMonthTotal(businessId, year, month, 1),
    getPrevMonthTotal(businessId, year, month, 3),
    getMonthlyExpenses(businessId, year, month),
    getPrevMonthExpenses(businessId, year, month, 1),
    getMonthlyIncome(businessId, year, month),
    getAllProducts(businessId),
    getMonthlyStockCost(businessId, year, month),
    getCapital(businessId),
    getUnpaidSales(businessId, year, month),
  ]);

  const totalIncome = thisMonthRevenue + thisMonthIncome;
  const totalExpenses = thisMonthExpenses + monthlyStockCost;
  const profit = totalIncome - totalExpenses;
  const growthPct = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // === 1. PERFORMANCE INSIGHTS ===
  if (growthPct > 5) {
    insights.push({
      type: 'performance',
      priority: 'success',
      title: `Revenue grew ${growthPct.toFixed(0)}% vs last month`,
      detail: `Revenue: MVR ${fmt(thisMonthRevenue)} vs MVR ${fmt(lastMonthRevenue)} last month. Strong performance — keep this momentum going.`,
    });
  } else if (growthPct < -5) {
    insights.push({
      type: 'performance',
      priority: 'warning',
      title: `Revenue dropped ${Math.abs(growthPct).toFixed(0)}% vs last month`,
      detail: `Revenue fell to MVR ${fmt(thisMonthRevenue)} from MVR ${fmt(lastMonthRevenue)}. Check if any top products ran out of stock.`,
    });
  } else {
    insights.push({
      type: 'performance',
      priority: 'info',
      title: `Revenue stable (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(0)}%)`,
      detail: `Revenue MVR ${fmt(thisMonthRevenue)} — consistent with last month. Predictable income is healthy.`,
    });
  }

  // === 2. TOP PRODUCTS ANALYSIS ===
  const productStats = await analyzeProducts(products, businessId, year, month);

  if (productStats.breadwinner) {
    const p = productStats.breadwinner;
    insights.push({
      type: 'topProduct',
      priority: 'success',
      title: `${p.name} is your breadwinner`,
      detail: `Drove ${p.revenueShare.toFixed(0)}% of revenue (MVR ${fmt(p.revenue)}, ${p.unitsSold} units sold, ${p.marginPct.toFixed(0)}% margin).`,
      suggestion: `Stock more of this — it's your most reliable earner. Consider ordering ${Math.ceil(p.unitsSold * 1.2)} units for next month.`,
    });
  }

  if (productStats.highVolumeLowMargin.length > 0) {
    for (const p of productStats.highVolumeLowMargin.slice(0, 3)) {
      const suggestedPrice = Math.ceil(p.buyPrice * 1.5);
      insights.push({
        type: 'topProduct',
        priority: 'warning',
        title: `${p.name}: high sales, low margin`,
        detail: `Sold ${p.unitsSold} units but only ${p.marginPct.toFixed(0)}% margin. You're moving volume but not earning much per unit.`,
        suggestion: `Consider raising price to MVR ${suggestedPrice} — you'd earn MVR ${fmt((suggestedPrice - p.buyPrice) * p.unitsSold)} instead of MVR ${fmt((p.price - p.buyPrice) * p.unitsSold)}.`,
      });
    }
  }

  // === 3. DEAD STOCK ===
  for (const p of productStats.deadStock) {
    const tiedUp = p.buyPrice * p.stock;
    insights.push({
      type: 'deadStock',
      priority: 'danger',
      title: `${p.name} — dead stock`,
      detail: `0 sales in 30+ days. MVR ${fmt(tiedUp)} tied up in ${p.stock} unsold units.`,
      suggestion: p.buyPrice > 0
        ? `Discount to MVR ${Math.ceil(p.buyPrice)} (break even) or return to supplier. Free up MVR ${fmt(tiedUp)} in capital.`
        : `Clear it out — it's taking up space with no return.`,
    });
    actions.push({
      id: `dead-${p.id}`,
      priority: 80,
      type: 'clearance',
      title: `Clear dead stock: ${p.name}`,
      detail: `MVR ${fmt(tiedUp)} tied in ${p.stock} units, 0 sales in 30 days`,
      suggestion: `Discount to MVR ${Math.ceil(p.price * 0.5)} or return to supplier`,
    });
  }

  // === 4. MARGIN CRASHES ===
  for (const p of productStats.marginCrash) {
    insights.push({
      type: 'marginCrash',
      priority: 'danger',
      title: `${p.name} — margin crash`,
      detail: `Margin dropped from ${p.lastMargin.toFixed(0)}% to ${p.currentMargin.toFixed(0)}%. This is a ${((p.lastMargin - p.currentMargin) / p.lastMargin * 100).toFixed(0)}% decline.`,
      suggestion: `Check if buy price increased. If buy price went up, raise sell price to maintain at least ${Math.max(p.lastMargin, 40).toFixed(0)}% margin.`,
    });
    actions.push({
      id: `margin-${p.id}`,
      priority: 90,
      type: 'price-review',
      title: `Review ${p.name} pricing`,
      detail: `Margin crashed from ${p.lastMargin.toFixed(0)}% to ${p.currentMargin.toFixed(0)}%`,
      suggestion: `Raise price to MVR ${Math.ceil(p.buyPrice / (1 - Math.max(p.lastMargin, 40) / 100))} to restore margin`,
    });
  }

  // === 5. LOW SELLERS ===
  for (const p of productStats.lowSellers.slice(0, 3)) {
    insights.push({
      type: 'lowSeller',
      priority: 'warning',
      title: `${p.name} — low sales`,
      detail: `Only ${p.unitsSold} sale(s) this month despite ${p.stock} units in stock and ${p.marginPct.toFixed(0)}% margin.`,
      suggestion: `Consider promoting this product, bundling it with top sellers, or discontinuing if trend continues.`,
    });
  }

  // === 6. EXPENSE ANOMALIES ===
  const expenseAnomalies = await analyzeExpenses(businessId, year, month);
  for (const anomaly of expenseAnomalies) {
    insights.push({
      type: 'expenseAnomaly',
      priority: 'warning',
      title: `${anomaly.type} spending ${anomaly.pctAbove.toFixed(0)}% above average`,
      detail: `Spent MVR ${fmt(anomaly.amount)} this month vs MVR ${fmt(anomaly.avg)} 3-month average. That's MVR ${fmt(anomaly.amount - anomaly.avg)} extra.`,
      suggestion: `Review expense logs for ${anomaly.type.toLowerCase()} — check for duplicate entries or one-off costs.`,
    });
  }

  // === 7. CASH FLOW HEALTH ===
  const netCashFlow = profit;
  const currentCapital = capital + netCashFlow;

  if (profit > 0) {
    insights.push({
      type: 'forecast',
      priority: 'success',
      title: `Profitable month: +MVR ${fmt(profit)}`,
      detail: `Revenue MVR ${fmt(totalIncome)} minus expenses MVR ${fmt(totalExpenses)}. Your capital grew from MVR ${fmt(capital)} to MVR ${fmt(currentCapital)}.`,
    });
  } else {
    insights.push({
      type: 'forecast',
      priority: 'danger',
      title: `Loss this month: -MVR ${fmt(Math.abs(profit))}`,
      detail: `Expenses (MVR ${fmt(totalExpenses)}) exceeded revenue (MVR ${fmt(totalIncome)}). Capital dropped from MVR ${fmt(capital)} to MVR ${fmt(currentCapital)}.`,
      suggestion: `Cut non-essential expenses and focus on selling your top products.`,
    });
  }

  // === 8. FORECAST ===
  const avgGrowth = threeMonthRevenue > 0
    ? (thisMonthRevenue - getPrevMonthTotalSafe(threeMonthRevenue, 3)) / threeMonthRevenue
    : 0;
  const projectedRevenue = thisMonthRevenue * (1 + avgGrowth);
  const range = projectedRevenue * 0.08;
  const projectedProfit = projectedRevenue - totalExpenses;
  const projectedCapital = currentCapital + projectedProfit;

  insights.push({
    type: 'forecast',
    priority: projectedCapital > capital ? 'success' : 'warning',
    title: `Next month forecast`,
    detail: `Revenue: MVR ${fmt(projectedRevenue - range)} – ${fmt(projectedRevenue + range)}. Expenses est. MVR ${fmt(totalExpenses)}.`,
    suggestion: projectedCapital > capital
      ? `On track. Capital could reach MVR ${fmt(projectedCapital)} by end of ${MONTHS[(month) % 12]}.`
      : `Trend is declining. Focus on increasing sales of your top 2 products.`,
  });

  // === 9. ACTION ITEMS ===
  // Reorder alerts
  for (const p of productStats.reorderNeeded) {
    const daysLeft = p.daysOfStock;
    const suggestedOrder = Math.ceil(p.dailySalesRate * 30);
    actions.push({
      id: `reorder-${p.id}`,
      priority: Math.round(Math.max(0, (14 - daysLeft) / 14) * 100),
      type: 'reorder',
      title: `Reorder ${p.name}`,
      detail: `${daysLeft} days of stock left (${p.stock} units, selling ~${p.dailySalesRate.toFixed(1)}/day)`,
      suggestion: `Order ${suggestedOrder} units for next month (~MVR ${fmt(suggestedOrder * p.buyPrice)} cost)`,
    });
  }

  // Unpaid sales follow-up
  if (unpaidSales.length > 0) {
    const totalOutstanding = unpaidSales.reduce((sum, s) => sum + s.total, 0);
    actions.push({
      id: 'follow-up-unpaid',
      priority: 70,
      type: 'follow-up',
      title: `Follow up on ${unpaidSales.length} unpaid sales`,
      detail: `MVR ${fmt(totalOutstanding)} outstanding from ${unpaidSales.length} sale(s)`,
      suggestion: unpaidSales.map(s => `→ Sale ${s.id}: MVR ${fmt(s.total)}`).join('\n'),
    });
  }

  // Sort actions by priority
  actions.sort((a, b) => b.priority - a.priority);

  // Generate summary
  const dangerCount = insights.filter(i => i.priority === 'danger').length;
  const successCount = insights.filter(i => i.priority === 'success').length;
  const summary = dangerCount > 2
    ? `${actions.length} urgent issues need attention`
    : successCount > 2
      ? `Strong month — ${actions.length} items to optimize next month`
      : `${insights.length} insights, ${actions.length} actions for next month`;

  return {
    month: MONTHS[month - 1],
    year,
    insights,
    actions,
    summary,
    revenueGrowthPct: growthPct,
    projectedRevenue: { low: projectedRevenue - range, high: projectedRevenue + range },
    capitalProjection: projectedCapital,
    status: dangerCount > 2 ? 'red' : profit > 0 ? 'green' : 'yellow',
  };
}

// ========== HELPER FUNCTIONS ==========

async function getMonthlyTotal(businessId: string, year: number, month: number): Promise<number> {
  const db = getDb();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total FROM sales
     WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
    businessId, String(year), String(month).padStart(2, '0')
  );
  return result?.total ?? 0;
}

async function getPrevMonthTotal(businessId: string, year: number, month: number, monthsBack: number): Promise<number> {
  const targetDate = new Date(year, month - 1 - monthsBack, 1);
  return getMonthlyTotal(businessId, targetDate.getFullYear(), targetDate.getMonth() + 1);
}

function getPrevMonthTotalSafe(current: number, monthsBack: number): number {
  // Simplified: assume current is average, return current for projection
  return current / (monthsBack > 0 ? 1 : 1);
}

async function getMonthlyExpenses(businessId: string, year: number, month: number): Promise<number> {
  const db = getDb();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
    businessId, String(year), String(month).padStart(2, '0')
  );
  return result?.total ?? 0;
}

async function getPrevMonthExpenses(businessId: string, year: number, month: number, monthsBack: number): Promise<number> {
  const targetDate = new Date(year, month - 1 - monthsBack, 1);
  return getMonthlyExpenses(businessId, targetDate.getFullYear(), targetDate.getMonth() + 1);
}

async function getMonthlyIncome(businessId: string, year: number, month: number): Promise<number> {
  const db = getDb();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM income
     WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
    businessId, String(year), String(month).padStart(2, '0')
  );
  return result?.total ?? 0;
}

async function getAllProducts(businessId: string): Promise<any[]> {
  const db = getDb();
  return await db.getAllAsync<any>('SELECT * FROM products WHERE business_id = ?', businessId);
}

async function getMonthlyStockCost(businessId: string, year: number, month: number): Promise<number> {
  const db = getDb();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(si.buy_price * si.quantity), 0) as total FROM sale_items si
     INNER JOIN sales s ON si.sale_id = s.id
     WHERE s.business_id = ? AND STRFTIME('%Y', s.timestamp) = ? AND STRFTIME('%m', s.timestamp) = ?`,
    businessId, String(year), String(month).padStart(2, '0')
  );
  return result?.total ?? 0;
}

async function getCapital(businessId: string): Promise<number> {
  const db = getDb();
  const biz = await db.getFirstAsync<{ capital: number }>(
    'SELECT capital FROM businesses WHERE id = ?', businessId
  );
  return biz?.capital ?? 0;
}

async function getUnpaidSales(businessId: string, year: number, month: number): Promise<any[]> {
  const db = getDb();
  return await db.getAllAsync<any>(
    `SELECT id, total FROM sales WHERE business_id = ?
     AND payment_status = 'unpaid'
     AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
    businessId, String(year), String(month).padStart(2, '0')
  );
}

async function getProductSales(businessId: string, productId: string, year: number, month: number): Promise<any[]> {
  const db = getDb();
  return await db.getAllAsync<any>(
    `SELECT si.*, s.timestamp FROM sale_items si
     INNER JOIN sales s ON si.sale_id = s.id
     WHERE s.business_id = ? AND si.product_id = ?
     AND STRFTIME('%Y', s.timestamp) = ? AND STRFTIME('%m', s.timestamp) = ?`,
    businessId, productId, String(year), String(month).padStart(2, '0')
  );
}

async function getProductSalesLastMonth(businessId: string, productId: string, year: number, month: number): Promise<any[]> {
  const targetDate = new Date(year, month - 2, 1);
  return getProductSales(businessId, productId, targetDate.getFullYear(), targetDate.getMonth() + 1);
}

async function analyzeProducts(products: any[], businessId: string, year: number, month: number) {
  const stats = products.map(p => ({
    ...p,
    revenue: 0,
    unitsSold: 0,
    marginPct: p.price > 0 ? ((p.price - (p.buy_price || 0)) / p.price) * 100 : 0,
  }));

  // Calculate revenue and units sold per product this month
  for (const p of stats) {
    const sales = await getProductSales(businessId, p.id, year, month);
    p.revenue = sales.reduce((sum: number, s: any) => sum + s.total, 0);
    p.unitsSold = sales.reduce((sum: number, s: any) => sum + s.quantity, 0);
    p.lastMonthSales = await getProductSalesLastMonth(businessId, p.id, year, month);
    p.lastMonthRevenue = p.lastMonthSales.reduce((sum: number, s: any) => sum + s.total, 0);
  }

  const totalRevenue = stats.reduce((sum: number, p: any) => sum + p.revenue, 0);
  stats.forEach((p: any) => {
    p.revenueShare = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
    p.daysSinceLastSale = getLastSaleDays(p.lastMonthSales);
  });

  // Breadwinner: highest revenue share > 25%
  const sorted = [...stats].sort((a: any, b: any) => b.revenue - a.revenue);
  const breadwinner = sorted.find((p: any) => p.revenueShare > 25 && p.unitsSold > 0) || sorted[0];

  // High volume, low margin
  const highVolumeLowMargin = stats.filter((p: any) => p.unitsSold >= 20 && p.marginPct < 30 && p.revenue > 0);

  // Dead stock: 0 sales this month, stock > 0
  const deadStock = stats.filter((p: any) => p.unitsSold === 0 && p.stock > 0 && p.product_type === 'item');

  // Margin crash: margin dropped >50% from last month
  const marginCrash: any[] = [];
  for (const p of stats) {
    if (p.lastMonthRevenue > 0 && p.revenue > 0) {
      const lastMonthMargin = p.buy_price > 0 && p.price > 0
        ? ((p.price - p.buy_price) / p.price) * 100
        : p.marginPct;
      if (lastMonthMargin > p.marginPct * 1.5 && lastMonthMargin - p.marginPct > 10) {
        marginCrash.push({
          ...p,
          currentMargin: p.marginPct,
          lastMargin: lastMonthMargin,
        });
      }
    }
  }

  // Low sellers: ≤2 sales, well-stocked, not new
  const lowSellers = stats.filter((p: any) =>
    p.unitsSold <= 2 && p.stock > 5 && p.product_type === 'item' && p.revenue > 0
  );

  // Reorder needed: days of stock < 14
  const reorderNeeded: any[] = [];
  for (const p of stats) {
    if (p.unitsSold > 0 && p.stock > 0) {
      const dailyRate = p.unitsSold / 30;
      const daysLeft = p.stock / dailyRate;
      if (daysLeft < 14) {
        reorderNeeded.push({ ...p, dailySalesRate: dailyRate, daysOfStock: Math.round(daysLeft) });
      }
    }
  }

  return { breadwinner, highVolumeLowMargin, deadStock, marginCrash, lowSellers, reorderNeeded };
}

function getLastSaleDays(sales: any[]): number {
  if (sales.length === 0) return 999;
  const dates = sales.map((s: any) => new Date(s.timestamp).getTime());
  const lastSale = Math.max(...dates);
  const now = Date.now();
  return Math.round((now - lastSale) / (1000 * 60 * 60 * 24));
}

async function analyzeExpenses(businessId: string, year: number, month: number) {
  const db = getDb();
  const anomalies: any[] = [];

  // Get this month's expenses by type
  const thisMonthByType = await db.getAllAsync<any>(
    `SELECT expense_type, COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?
     GROUP BY expense_type`,
    businessId, String(year), String(month).padStart(2, '0')
  );

  // Get 3-month average by type
  const threeMonthAvg = await db.getAllAsync<any>(
    `SELECT expense_type, COALESCE(SUM(amount), 0) / 3 as avg FROM expenses
     WHERE business_id = ?
     AND timestamp >= datetime('now', '-3 months')
     GROUP BY expense_type`,
    businessId
  );

  const avgMap = new Map<string, number>();
  threeMonthAvg.forEach((row: any) => avgMap.set(row.expense_type, row.avg));

  for (const row of thisMonthByType) {
    const avg = avgMap.get(row.expense_type) || 0;
    if (avg > 0 && row.total > avg * 1.3) {
      anomalies.push({
        type: row.expense_type,
        amount: row.total,
        avg,
        pctAbove: ((row.total - avg) / avg) * 100,
      });
    }
  }

  return anomalies;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
