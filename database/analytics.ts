/**
 * Pre-computed Analytics Queries
 * Fast aggregations for dashboard and reports
 */

import { getDb } from './database-instance';

export interface SalesAnalytics {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
  yearTotal: number;
  yearCount: number;
  averageSaleValue: number;
  topPaymentMethod: string;
}

export interface ProductAnalytics {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export interface ExpenseAnalytics {
  monthTotal: number;
  yearTotal: number;
  byType: Record<string, number>;
}

/**
 * Get comprehensive sales analytics (single optimized query)
 */
export async function getSalesAnalytics(
  businessId: string,
  includeArchived: boolean = false
): Promise<SalesAnalytics> {
  const db = getDb();
  const table = includeArchived ? 'sales_archive' : 'sales';
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // Single query for all analytics
  const result = await db.getAllAsync<any>(`
    -- Today's stats
    SELECT 
      COALESCE(SUM(CASE WHEN DATE(timestamp) = '${today}' THEN total ELSE 0 END), 0) as today_total,
      COALESCE(SUM(CASE WHEN DATE(timestamp) = '${today}' THEN 1 ELSE 0 END), 0) as today_count,
      COALESCE(SUM(CASE WHEN timestamp >= '${monthStart}' THEN total ELSE 0 END), 0) as month_total,
      COALESCE(SUM(CASE WHEN timestamp >= '${monthStart}' THEN 1 ELSE 0 END), 0) as month_count,
      COALESCE(SUM(CASE WHEN timestamp >= '${yearStart}' THEN total ELSE 0 END), 0) as year_total,
      COALESCE(SUM(CASE WHEN timestamp >= '${yearStart}' THEN 1 ELSE 0 END), 0) as year_count,
      COALESCE(AVG(total), 0) as avg_sale_value
    FROM ${table}
    WHERE business_id = ?
  `, businessId);

  // Get top payment method
  const paymentResult = await db.getFirstAsync<any>(`
    SELECT payment_method, COUNT(*) as count
    FROM ${table}
    WHERE business_id = ?
    GROUP BY payment_method
    ORDER BY count DESC
    LIMIT 1
  `, businessId);

  const stats = result[0] || {};

  return {
    todayTotal: stats.today_total ?? 0,
    todayCount: stats.today_count ?? 0,
    monthTotal: stats.month_total ?? 0,
    monthCount: stats.month_count ?? 0,
    yearTotal: stats.year_total ?? 0,
    yearCount: stats.year_count ?? 0,
    averageSaleValue: stats.avg_sale_value ?? 0,
    topPaymentMethod: paymentResult?.payment_method ?? 'unknown',
  };
}

/**
 * Get product analytics (single optimized query)
 */
export async function getProductAnalytics(businessId: string): Promise<ProductAnalytics> {
  const db = getDb();

  // Product stats
  const stats = await db.getFirstAsync<any>(`
    SELECT
      COUNT(*) as total_products,
      COALESCE(SUM(CASE WHEN product_type = 'item' THEN price * stock ELSE 0 END), 0) as total_stock_value,
      COALESCE(SUM(CASE WHEN product_type = 'item' AND stock <= 5 THEN 1 ELSE 0 END), 0) as low_stock_count,
      COALESCE(SUM(CASE WHEN product_type = 'item' AND stock = 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
    FROM products
    WHERE business_id = ?
  `, businessId);

  // Top selling products (from recent sales only - fast query)
  const topProducts = await db.getAllAsync<any>(`
    SELECT 
      si.product_name as name,
      SUM(si.quantity) as quantity,
      SUM(si.total) as revenue
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE s.business_id = ?
    GROUP BY si.product_id
    ORDER BY quantity DESC
    LIMIT 10
  `, businessId);

  return {
    totalProducts: stats?.total_products ?? 0,
    totalStockValue: stats?.total_stock_value ?? 0,
    lowStockCount: stats?.low_stock_count ?? 0,
    outOfStockCount: stats?.out_of_stock_count ?? 0,
    topSellingProducts: topProducts.map((p: any) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
    })),
  };
}

/**
 * Get expense analytics
 */
export async function getExpenseAnalytics(
  businessId: string,
  includeArchived: boolean = false
): Promise<ExpenseAnalytics> {
  const db = getDb();
  const table = includeArchived ? 'expenses_archive' : 'expenses';
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // Monthly expenses
  const monthResult = await db.getFirstAsync<any>(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM ${table}
    WHERE business_id = ? AND timestamp >= ?
  `, businessId, monthStart);

  // Yearly expenses
  const yearResult = await db.getFirstAsync<any>(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM ${table}
    WHERE business_id = ? AND timestamp >= ?
  `, businessId, yearStart);

  // By type
  const byTypeResult = await db.getAllAsync<any>(`
    SELECT expense_type, COALESCE(SUM(amount), 0) as total
    FROM ${table}
    WHERE business_id = ?
    GROUP BY expense_type
  `, businessId);

  const byType: Record<string, number> = {};
  byTypeResult.forEach((row: any) => {
    byType[row.expense_type] = row.total;
  });

  return {
    monthTotal: monthResult?.total ?? 0,
    yearTotal: yearResult?.total ?? 0,
    byType,
  };
}

/**
 * Get monthly revenue trend (last 12 months)
 */
export async function getMonthlyRevenueTrend(businessId: string): Promise<Array<{ month: string; revenue: number; count: number }>> {
  const db = getDb();

  const result = await db.getAllAsync<any>(`
    SELECT 
      strftime('%Y-%m', timestamp) as month,
      COALESCE(SUM(total), 0) as revenue,
      COUNT(*) as count
    FROM sales
    WHERE business_id = ?
      AND timestamp >= datetime('now', '-12 months')
    GROUP BY month
    ORDER BY month ASC
  `, businessId);

  return result.map((row: any) => ({
    month: row.month,
    revenue: row.revenue,
    count: row.count,
  }));
}

/**
 * Get daily sales for current month
 */
export async function getDailySalesThisMonth(businessId: string): Promise<Array<{ date: string; revenue: number; count: number }>> {
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const result = await db.getAllAsync<any>(`
    SELECT 
      DATE(timestamp) as date,
      COALESCE(SUM(total), 0) as revenue,
      COUNT(*) as count
    FROM sales
    WHERE business_id = ?
      AND timestamp >= ?
    GROUP BY date
    ORDER BY date ASC
  `, businessId, monthStart);

  return result.map((row: any) => ({
    date: row.date,
    revenue: row.revenue,
    count: row.count,
  }));
}

/**
 * Get profit margin analysis
 */
export async function getProfitAnalytics(businessId: string): Promise<{
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}> {
  const db = getDb();

  const result = await db.getFirstAsync<any>(`
    SELECT 
      COALESCE(SUM(s.total), 0) as total_revenue,
      COALESCE(SUM(si.buy_price * si.quantity), 0) as total_cost,
      COALESCE(SUM(s.total - (si.buy_price * si.quantity)), 0) as total_profit
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE s.business_id = ?
  `, businessId);

  const totalRevenue = result?.total_revenue ?? 0;
  const totalCost = result?.total_cost ?? 0;
  const totalProfit = result?.total_profit ?? 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
  };
}
