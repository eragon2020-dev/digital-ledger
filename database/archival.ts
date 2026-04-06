/**
 * Data Archival System
 * Moves old records to archive tables to keep active data fast
 * Archive tables are queryable but not in the main app flow
 */

import { getDb } from './database-instance';

export interface ArchiveConfig {
  salesMonthsToKeep: number;    // Keep recent sales in main table (default: 12 months)
  expenseMonthsToKeep: number; // Keep recent expenses (default: 12 months)
  incomeMonthsToKeep: number;  // Keep recent income (default: 12 months)
}

const ARCHIVE_THRESHOLD = 100000; // 100K records

const DEFAULT_CONFIG: ArchiveConfig = {
  salesMonthsToKeep: 12,
  expenseMonthsToKeep: 12,
  incomeMonthsToKeep: 12,
};

/**
 * Create archive tables if they don't exist
 */
export async function createArchiveTables() {
  const db = getDb();

  await db.execAsync(`
    -- Archive tables (same schema as main tables)
    CREATE TABLE IF NOT EXISTS sales_archive (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items_archive (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      buy_price REAL DEFAULT 0,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses_archive (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      expense_type TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income_archive (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      timestamp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for archive tables
    CREATE INDEX IF NOT EXISTS idx_sales_archive_timestamp ON sales_archive(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sales_archive_business ON sales_archive(business_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_archive_timestamp ON expenses_archive(timestamp);
    CREATE INDEX IF NOT EXISTS idx_income_archive_timestamp ON income_archive(timestamp);
  `);
}

/**
 * Archive old sales records
 * @param config Archive configuration
 * @returns Number of records archived
 */
export async function archiveOldSales(config: ArchiveConfig = DEFAULT_CONFIG): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - config.salesMonthsToKeep);
  const cutoffStr = cutoffDate.toISOString();

  // Move sales to archive using parameterized queries
  await db.withTransactionAsync(async () => {
    // Copy sales to archive
    await db.runAsync(`
      INSERT OR IGNORE INTO sales_archive (id, business_id, subtotal, tax, tax_rate, total,
        payment_method, payment_status, timestamp, created_at, updated_at)
      SELECT id, business_id, subtotal, tax, tax_rate, total,
        payment_method, payment_status, timestamp, created_at, updated_at
      FROM sales
      WHERE timestamp < ?
    `, cutoffStr);

    // Copy sale items to archive
    await db.runAsync(`
      INSERT OR IGNORE INTO sale_items_archive (id, sale_id, product_id, product_name,
        price, quantity, total, buy_price)
      SELECT si.id, si.sale_id, si.product_id, si.product_name,
        si.price, si.quantity, si.total, si.buy_price
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      WHERE s.timestamp < ?
    `, cutoffStr);

    // Delete from main tables
    await db.runAsync(`
      DELETE FROM sale_items WHERE sale_id IN (
        SELECT id FROM sales WHERE timestamp < ?
      )
    `, cutoffStr);

    await db.runAsync(`
      DELETE FROM sales WHERE timestamp < ?
    `, cutoffStr);
  });

  // Get count of archived sales
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sales_archive'
  );
  
  return result?.count ?? 0;
}

/**
 * Archive old expenses
 */
export async function archiveOldExpenses(config: ArchiveConfig = DEFAULT_CONFIG): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - config.expenseMonthsToKeep);
  const cutoffStr = cutoffDate.toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`
      INSERT OR IGNORE INTO expenses_archive
      SELECT *, datetime('now') FROM expenses
      WHERE timestamp < ?
    `, cutoffStr);

    await db.runAsync(`
      DELETE FROM expenses WHERE timestamp < ?
    `, cutoffStr);
  });

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM expenses_archive'
  );
  
  return result?.count ?? 0;
}

/**
 * Archive old income records
 */
export async function archiveOldIncome(config: ArchiveConfig = DEFAULT_CONFIG): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - config.incomeMonthsToKeep);
  const cutoffStr = cutoffDate.toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(`
      INSERT OR IGNORE INTO income_archive
      SELECT *, datetime('now') FROM income
      WHERE timestamp < ?
    `, cutoffStr);

    await db.runAsync(`
      DELETE FROM income WHERE timestamp < ?
    `, cutoffStr);
  });

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM income_archive'
  );
  
  return result?.count ?? 0;
}

/**
 * Run archival - only if records exceed threshold
 */
export async function runArchival(config?: ArchiveConfig) {
  const db = getDb();

  // Check total record count
  const [salesCount, expenseCount, incomeCount] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sales'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM expenses'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM income'),
  ]);

  const totalRecords = (salesCount?.count ?? 0) + (expenseCount?.count ?? 0) + (incomeCount?.count ?? 0);

  // Only archive if exceeding threshold
  if (totalRecords < ARCHIVE_THRESHOLD) {
    return {
      salesArchived: 0,
      expensesArchived: 0,
      incomeArchived: 0,
      reason: `Total records (${totalRecords.toLocaleString()}) below threshold (${ARCHIVE_THRESHOLD.toLocaleString()})`,
    };
  }

  await createArchiveTables();

  const salesArchived = await archiveOldSales(config);
  const expensesArchived = await archiveOldExpenses(config);
  const incomeArchived = await archiveOldIncome(config);

  return {
    salesArchived,
    expensesArchived,
    incomeArchived,
    reason: `Archived records exceeding threshold (${ARCHIVE_THRESHOLD.toLocaleString()})`,
  };
}

/**
 * Get sales count including archived data
 */
export async function getTotalSalesCount(businessId: string): Promise<number> {
  const db = getDb();

  const [main, archive] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sales WHERE business_id = ?',
      businessId
    ),
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sales_archive WHERE business_id = ?',
      businessId
    ),
  ]);

  return (main?.count ?? 0) + (archive?.count ?? 0);
}

/**
 * Get total revenue including archived data
 */
export async function getTotalRevenue(businessId: string): Promise<number> {
  const db = getDb();

  const [main, archive] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      'SELECT SUM(total) as total FROM sales WHERE business_id = ?',
      businessId
    ),
    db.getFirstAsync<{ total: number }>(
      'SELECT SUM(total) as total FROM sales_archive WHERE business_id = ?',
      businessId
    ),
  ]);

  return (main?.total ?? 0) + (archive?.total ?? 0);
}
