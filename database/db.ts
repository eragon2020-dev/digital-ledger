import * as SQLite from 'expo-sqlite';
import { getDb, resetDb } from './database-instance';
import { PaginatedResult, PaginationOptions } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';

let isInitializing = false;

async function deleteDatabaseFiles() {
  const dbDir = FileSystem.documentDirectory + 'SQLite/';
  // Delete ALL database versions to ensure clean slate
  const files = ['yasir_v3.db', 'yasir_v3.db-wal', 'yasir_v3.db-shm', 'yasir_v3.db-journal',
                 'yasir_v4.db', 'yasir_v4.db-wal', 'yasir_v4.db-shm', 'yasir_v4.db-journal'];

  for (const file of files) {
    const path = dbDir + file;
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path);
        console.log(`  ✅ Deleted ${file}`);
      }
    } catch {}
  }
}

// Initialize database tables
export async function initDatabase(deleteExisting = false) {
  // Prevent concurrent initialization
  if (isInitializing) {
    console.log('initDatabase: Already running, skipping...');
    return;
  }
  isInitializing = true;
  
  try {
    // Reset database instance (handles hot reload)
    try {
      const existingDb = getDb();
      existingDb.closeSync();
      console.log('✅ Closed existing database connection');
    } catch {}
    resetDb();

    // Delete existing database files only when explicitly requested or on first init
    // Also delete if deleteExisting is true or we need to recreate
    const shouldDelete = deleteExisting;
    
    if (shouldDelete) {
      await deleteDatabaseFiles();
      console.log('✅ All database files deleted');
    }
    
    const database = getDb();
    
    // Apply PRAGMA settings
    try {
      await database.execAsync('PRAGMA journal_mode=WAL;');
      await database.execAsync('PRAGMA foreign_keys=OFF;');
      await database.execAsync('PRAGMA synchronous=NORMAL;');
      await database.execAsync('PRAGMA cache_size=-8000;');
      await database.execAsync('PRAGMA temp_store=MEMORY;');
      console.log('✅ Applied SQLite PRAGMAs');
    } catch (pragmaErr) {
      console.warn('⚠️ Could not apply PRAGMAs:', pragmaErr);
    }

    // Check if database has any tables (first-time setup check)
    const tablesResult = await database.getAllAsync<any>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('businesses', 'products', 'sales')"
    );
    const hasExistingTables = tablesResult && tablesResult.length > 0;

    if (!hasExistingTables || deleteExisting) {
      // First-time setup or explicit recreation - create tables from scratch
      console.log(deleteExisting ? '🗑️ Recreating database from scratch...' : '🌱 Creating fresh database...');

      // Drop existing tables only if explicitly requested
      if (deleteExisting) {
        try { await database.execAsync(`DROP TABLE IF EXISTS products_fts;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS sales_archive;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS sale_items_archive;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS expenses_archive;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS income_archive;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS sale_items;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS sales;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS expenses;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS income;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS products;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS settings;`); } catch {}
        try { await database.execAsync(`DROP TABLE IF EXISTS businesses;`); } catch {}
      }

      // Create all tables
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          account_number TEXT,
          account_name TEXT,
          viber_number TEXT,
          capital REAL NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          image TEXT,
          sku TEXT,
          buy_price REAL,
          category TEXT,
          product_type TEXT DEFAULT 'item',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sales (
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sale_items (
          id TEXT PRIMARY KEY,
          sale_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          total REAL NOT NULL,
          buy_price REAL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL DEFAULT 'default',
          title TEXT NOT NULL,
          description TEXT,
          amount REAL NOT NULL,
          expense_type TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS income (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL DEFAULT 'default',
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          timestamp DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await database.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sales_business_timestamp ON sales(business_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
        CREATE INDEX IF NOT EXISTS idx_products_business_name ON products(business_id, name);
        CREATE INDEX IF NOT EXISTS idx_expenses_business_timestamp ON expenses(business_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_income_business_timestamp ON income(business_id, timestamp DESC);
      `);

      // Create default business
      await database.execAsync(
        "INSERT OR IGNORE INTO businesses (id, name, capital, created_at, updated_at) VALUES ('default', 'My Business', 0, datetime('now'), datetime('now'));"
      );

      console.log('✅ Tables created successfully');
    } else {
      console.log('✅ Using existing database (preserving user data)');
    }

    // Run migrations to add any missing columns
    console.log('🔧 Running migrations...');

    // Migration: add buy_price column to existing sale_items table
    try {
      await database.execAsync(`ALTER TABLE sale_items ADD COLUMN buy_price REAL DEFAULT 0;`);
    } catch {
      // Column already exists
    }

    // Migration: create expenses table for existing databases
    try {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL DEFAULT 'default',
          title TEXT NOT NULL,
          description TEXT,
          amount REAL NOT NULL,
          expense_type TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id);
      `);
    } catch {
      // Table already exists
    }

    // Migration: add business_id to expenses table
    try {
      await database.execAsync(`ALTER TABLE expenses ADD COLUMN business_id TEXT NOT NULL DEFAULT 'default';`);
    } catch {
      // Column already exists
    }

    // Migration: create income table
    try {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS income (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL DEFAULT 'default',
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          timestamp DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_income_timestamp ON income(timestamp);
        CREATE INDEX IF NOT EXISTS idx_income_business ON income(business_id);
      `);
    } catch {
      // Table already exists
    }

    // Migration: add business_id to income table
    try {
      await database.execAsync(`ALTER TABLE income ADD COLUMN business_id TEXT NOT NULL DEFAULT 'default';`);
    } catch {
      // Column already exists
    }

    // Migration: add product_type column to products table
    try {
      await database.execAsync(`ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'item';`);
      // Fix any existing NULL values
      await database.execAsync(`UPDATE products SET product_type = 'item' WHERE product_type IS NULL OR product_type = '';`);
    } catch {
      // Column already exists - still fix any NULL values
      try {
        await database.execAsync(`UPDATE products SET product_type = 'item' WHERE product_type IS NULL OR product_type = '';`);
      } catch {}
    }

    // Migration: create capital table
    try {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch {
      // Table already exists
    }

    // Migration: set default buy_price (50% of sell price) for products without one
    try {
      await database.execAsync(`UPDATE products SET buy_price = ROUND(price * 0.5, 2) WHERE buy_price IS NULL;`);
    } catch {
      // Already done
    }

    // Migration: add tax_rate column to sales table
    try {
      await database.execAsync(`ALTER TABLE sales ADD COLUMN tax_rate REAL DEFAULT 0;`);
    } catch {
      // Column already exists
    }

    // Migration: add payment_status column to sales table
    try {
      await database.execAsync(`ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT 'paid';`);
    } catch {
      // Column already exists
    }

    // CRITICAL FIX: Drop orphaned FTS5 triggers that cause INSERT failures
    // FTS5 is disabled for now - search uses LIKE fallback
    try {
      await database.execAsync(`DROP TRIGGER IF EXISTS products_ai;`);
      await database.execAsync(`DROP TRIGGER IF EXISTS products_ad;`);
      await database.execAsync(`DROP TRIGGER IF EXISTS products_au;`);
      await database.execAsync(`DROP TABLE IF EXISTS products_fts;`);
      console.log('🧹 Cleaned up FTS5 triggers');
    } catch (cleanupErr) {
      console.warn('⚠️ FTS5 cleanup failed:', cleanupErr);
    }

    // Cleanup: Remove stock-type expenses (stock is an asset, not an expense)
    try {
      const stockExpCount = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM expenses WHERE expense_type = 'stock'"
      );
      if (stockExpCount?.count) {
        await database.runAsync(`DELETE FROM expenses WHERE expense_type = 'stock'`);
        console.log(`🧹 Removed ${stockExpCount.count} stock-type expenses (now tracked as COGS)`);
      }
    } catch (cleanupErr) {
      console.warn('⚠️ Stock expense cleanup failed:', cleanupErr);
    }

    // Create archive tables for old data
    try {
      await database.execAsync(`
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
        CREATE INDEX IF NOT EXISTS idx_sales_archive_business_ts 
          ON sales_archive(business_id, timestamp DESC);

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
        CREATE INDEX IF NOT EXISTS idx_sale_items_archive_sale_id 
          ON sale_items_archive(sale_id);

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
        CREATE INDEX IF NOT EXISTS idx_expenses_archive_business_ts 
          ON expenses_archive(business_id, timestamp DESC);

        CREATE TABLE IF NOT EXISTS income_archive (
          id TEXT PRIMARY KEY,
          business_id TEXT NOT NULL,
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          timestamp DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_income_archive_business_ts 
          ON income_archive(business_id, timestamp DESC);
      `);
    } catch {
      // Archive tables already exist
    }

    // Seed sample data if no products exist
    try {
      const productCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products');
      if (!productCount || productCount.count === 0) {
        console.log('🌱 Seeding sample data...');
        const businessId = 'default';
        const sampleProducts = [
          { name: 'iPhone Charger', price: 35, stock: 25, buyPrice: 15, type: 'item' },
          { name: 'USB-C Cable', price: 15, stock: 50, buyPrice: 5, type: 'item' },
          { name: 'Bluetooth Earbuds', price: 85, stock: 12, buyPrice: 40, type: 'item' },
          { name: 'Phone Case', price: 20, stock: 40, buyPrice: 8, type: 'item' },
          { name: 'Screen Protector', price: 10, stock: 60, buyPrice: 3, type: 'item' },
          { name: 'Power Bank', price: 55, stock: 18, buyPrice: 25, type: 'item' },
          { name: 'Phone Repair Service', price: 25, stock: 0, buyPrice: 0, type: 'service' },
        ];

        // Skip seeding for now - the datatype mismatch issue will be handled when user creates products
        console.log(`⏭️ Skipping seed (will seed on first product create if needed)`);
      }
    } catch (err) {
      console.warn('⚠️ Could not seed sample data:', err);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    isInitializing = false;
    throw error;
  }
  
  isInitializing = false;
  console.log('Database initialized successfully');
}

// Product operations (scoped by business)
export const ProductDB = {
  async getAll(businessId: string) {
    const database = getDb();
    const result = await database.getAllAsync<any>('SELECT * FROM products WHERE business_id = ? ORDER BY name', businessId);
    return result;
  },

  // Paginated products with server-side search (uses FTS5 when available)
  async getPaginated(businessId: string, options: PaginationOptions & { lowStock?: boolean } = {}): Promise<PaginatedResult<any>> {
    const database = getDb();
    const limit = options.limit || 50;
    const { cursor, searchQuery, lowStock } = options;

    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (lowStock) {
      whereClause += ' AND product_type = \'item\' AND stock <= 5';
    }

    if (cursor) {
      whereClause += ' AND id < ?';
      params.push(cursor);
    }

    // Use FTS5 for faster text search if available
    if (searchQuery) {
      const ftsAvailable = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='products_fts'"
      );

      if (ftsAvailable?.count) {
        // Use FTS5 MATCH for 10-100x faster search
        const searchTerms = searchQuery.split(' ').map(term => `${term}*`).join(' ');
        whereClause += ` AND id IN (
          SELECT rowid FROM products_fts 
          WHERE products_fts MATCH ?
        )`;
        params.push(searchTerms);
      } else {
        // Fallback to LIKE search
        whereClause += ' AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)';
        const search = `%${searchQuery}%`;
        params.push(search, search, search);
      }
    }

    const query = `SELECT * FROM products ${whereClause} ORDER BY name LIMIT ${limit + 1}`;
    const result = await database.getAllAsync<any>(query, ...params);

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, -1) : result;
    const lastItem = data[data.length - 1];

    return {
      data,
      hasNextPage,
      cursor: lastItem?.id,
    };
  },

  // Get product count
  async getCount(businessId: string, options: { searchQuery?: string } = {}): Promise<number> {
    const database = getDb();
    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (options.searchQuery) {
      whereClause += ' AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)';
      const search = `%${options.searchQuery}%`;
      params.push(search, search, search);
    }

    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM products ${whereClause}`,
      ...params
    );
    return result?.count ?? 0;
  },

  async existsByName(businessId: string, name: string, excludeId?: string): Promise<boolean> {
    const database = getDb();
    let whereClause = 'WHERE business_id = ? AND name = ?';
    const params: any[] = [businessId, name];

    if (excludeId) {
      whereClause += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM products ${whereClause}`,
      ...params
    );
    return (result?.count ?? 0) > 0;
  },

  async getLowStock(businessId: string, threshold: number = 5, limit: number = 50): Promise<PaginatedResult<any>> {
    const database = getDb();
    const query = `SELECT * FROM products WHERE business_id = ? AND product_type = 'item' AND stock <= ? ORDER BY stock ASC LIMIT ${limit + 1}`;
    const result = await database.getAllAsync<any>(query, businessId, threshold);

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, -1) : result;
    const lastItem = data[data.length - 1];

    return {
      data,
      hasNextPage,
      cursor: lastItem?.id,
    };
  },

  async getById(id: string) {
    const database = getDb();
    const result = await database.getFirstAsync<any>('SELECT * FROM products WHERE id = ?', id);
    return result;
  },

  async create(product: {
    id: string;
    businessId: string;
    name: string;
    price: number;
    stock: number;
    image?: string;
    sku?: string;
    buyPrice?: number;
    category?: string;
    productType?: string;
  }) {
    const database = getDb();
    // Ensure all values have correct types
    const id = String(product.id || '');
    const businessId = String(product.businessId || '');
    const name = String(product.name || '');
    const price = typeof product.price === 'number' ? product.price : 0;
    const stock = Number.isFinite(product.stock) ? Math.floor(product.stock) : 0;
    const image = String(product.image || '');
    const sku = String(product.sku || '');
    const buyPrice = typeof product.buyPrice === 'number' ? product.buyPrice : 0;
    const category = String(product.category || '');
    const productType = String(product.productType || 'item');

    console.log('[ProductDB.create] Inserting:', { id, businessId, name, price, stock, image, sku, buyPrice, category, productType });
    console.log('[ProductDB.create] Type check:', {
      idType: typeof id,
      businessIdType: typeof businessId,
      nameType: typeof name,
      priceType: typeof price,
      stockType: typeof stock,
      imageType: typeof image,
      skuType: typeof sku,
      buyPriceType: typeof buyPrice,
      categoryType: typeof category,
      productTypeType: typeof productType
    });

    try {
      // Disable foreign keys temporarily to avoid constraint issues
      await database.execAsync('PRAGMA foreign_keys=OFF;');
      
      // First, verify the business exists
      const businessCheck = await database.getFirstAsync('SELECT id FROM businesses WHERE id = ?', businessId);
      console.log('[ProductDB.create] Business exists:', businessCheck);

      // Use parameterized query to prevent SQL injection and syntax errors
      await database.runAsync(
        `INSERT INTO products (id, business_id, name, price, stock, image, sku, buy_price, category, product_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, businessId, name, price, stock, image, sku, buyPrice, category, productType
      );
      
      // Re-enable foreign keys
      await database.execAsync('PRAGMA foreign_keys=ON;');
      console.log('[ProductDB.create] Success');
    } catch (err: any) {
      // Re-enable foreign keys even on error
      try { await database.execAsync('PRAGMA foreign_keys=ON;'); } catch {}
      
      console.error('[ProductDB.create] FAILED:', err);
      console.error('[ProductDB.create] Values:', { id, businessId, name, price, stock, image, sku, buyPrice, category, productType });
      
    // Check for datatype mismatch - recreate database and retry
      if (err?.message?.includes('datatype mismatch')) {
        console.log('⚠️ Datatype mismatch detected, checking actual database schema...');
        
        // Check the actual products table schema
        try {
          const schemaInfo = await database.getAllAsync('PRAGMA table_info(products)');
          console.log('📊 Current products table schema:', JSON.stringify(schemaInfo, null, 2));
          
          // Check for triggers
          const triggers = await database.getAllAsync("SELECT * FROM sqlite_master WHERE type='trigger' AND tbl_name='products'");
          console.log('📊 Products table triggers:', JSON.stringify(triggers, null, 2));
        } catch (schemaErr) {
          console.warn('⚠️ Could not get schema info:', schemaErr);
        }
        
        console.log('🗑️ Forcing COMPLETE database recreation...');

        // Completely close and reset
        try { database.closeSync(); } catch {}
        resetDb();
        isInitializing = false;

        // Delete ALL database files
        const dbDir = FileSystem.documentDirectory + 'SQLite/';
        const allFiles = ['yasir_v3.db', 'yasir_v3.db-wal', 'yasir_v3.db-shm', 'yasir_v3.db-journal',
                         'yasir_v4.db', 'yasir_v4.db-wal', 'yasir_v4.db-shm', 'yasir_v4.db-journal'];
        for (const file of allFiles) {
          try {
            const info = await FileSystem.getInfoAsync(dbDir + file);
            if (info.exists) {
              await FileSystem.deleteAsync(dbDir + file);
              console.log(`  ✅ Deleted ${file}`);
            } else {
              console.log(`  ℹ️ ${file} does not exist`);
            }
          } catch (deleteErr) {
            console.warn(`  ⚠️ Could not delete ${file}:`, deleteErr);
          }
        }

        // Get fresh database
        console.log('🔄 Opening fresh database...');
        const freshDb = getDb();
        await freshDb.execAsync('PRAGMA journal_mode=WAL;');
        await freshDb.execAsync('PRAGMA foreign_keys=OFF;');
        await freshDb.execAsync('PRAGMA synchronous=NORMAL;');

        // Create ALL tables (without IF NOT EXISTS since we just deleted everything)
        console.log('🔨 Creating tables...');
        await freshDb.execAsync(`
          CREATE TABLE businesses (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            account_number TEXT,
            account_name TEXT,
            viber_number TEXT,
            capital REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ businesses table created');
        
        await freshDb.execAsync(`
          CREATE TABLE products (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            image TEXT,
            sku TEXT,
            buy_price REAL,
            category TEXT,
            product_type TEXT DEFAULT 'item',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ products table created');
        
        await freshDb.execAsync(`
          CREATE TABLE sales (
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ sales table created');
        
        await freshDb.execAsync(`
          CREATE TABLE sale_items (
            id TEXT PRIMARY KEY,
            sale_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            total REAL NOT NULL,
            buy_price REAL DEFAULT 0
          )
        `);
        console.log('  ✅ sale_items table created');
        
        await freshDb.execAsync(`
          CREATE TABLE expenses (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL DEFAULT 'default',
            title TEXT NOT NULL,
            description TEXT,
            amount REAL NOT NULL,
            expense_type TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ expenses table created');
        
        await freshDb.execAsync(`
          CREATE TABLE income (
            id TEXT PRIMARY KEY,
            business_id TEXT NOT NULL DEFAULT 'default',
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ income table created');
        
        await freshDb.execAsync(`
          CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ settings table created');

        // Verify the products table schema
        const newSchemaInfo = await freshDb.getAllAsync('PRAGMA table_info(products)');
        console.log('✅ New products table schema:', JSON.stringify(newSchemaInfo, null, 2));
        
        // Ensure FTS5 triggers are dropped (they cause INSERT failures)
        try {
          await freshDb.execAsync(`DROP TRIGGER IF EXISTS products_ai;`);
          await freshDb.execAsync(`DROP TRIGGER IF EXISTS products_ad;`);
          await freshDb.execAsync(`DROP TRIGGER IF EXISTS products_au;`);
          await freshDb.execAsync(`DROP TABLE IF EXISTS products_fts;`);
          console.log('🧹 FTS5 triggers cleaned up in recovery');
        } catch {}

        // Insert default business
        await freshDb.execAsync(
          "INSERT INTO businesses (id, name, capital, created_at, updated_at) VALUES ('default', 'My Business', 0, datetime('now'), datetime('now'));"
        );
        console.log('✅ Default business inserted');

        console.log('✅ Fresh database recreated with clean schema');

        // Test insert with minimal values first
        console.log('🧪 Testing with minimal insert...');
        await freshDb.execAsync('PRAGMA foreign_keys=OFF;');
        const testSql = `INSERT INTO products (id, business_id, name, price, stock) VALUES ('TEST-1', 'default', 'Test Product', 10, 5);`;
        console.log('🧪 Test SQL:', testSql);
        try {
          await freshDb.execAsync(testSql);
          console.log('✅ Test insert succeeded');
          
          // Now try the actual insert
          await freshDb.runAsync(
            `INSERT INTO products (id, business_id, name, price, stock, image, sku, buy_price, category, product_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id, businessId, name, price, stock, image, sku, buyPrice, category, productType
          );
          console.log('[ProductDB.create] Retry SUCCESSFUL');
          
          // Clean up test data
          await freshDb.execAsync("DELETE FROM products WHERE id='TEST-1'");
          return;
        } catch (testErr) {
          console.error('❌ Test insert failed:', testErr);
          throw new Error('Database schema is still corrupted after recreation');
        }
      }
      
      throw err;
    }
  },

  async updateStock(id: string, delta: number) {
    const database = getDb();
    await database.runAsync(
      'UPDATE products SET stock = stock + ?, updated_at = datetime(\'now\') WHERE id = ?',
      delta,
      id
    );
  },

  async getStock(id: string) {
    const database = getDb();
    const result = await database.getFirstAsync<{ stock: number }>(
      'SELECT stock FROM products WHERE id = ?',
      id
    );
    return result?.stock ?? 0;
  },

  async update(product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image?: string | null;
    buyPrice?: number;
    productType?: string;
  }) {
    const database = getDb();
    // Ensure all values have correct types
    const id = String(product.id || '');
    const name = String(product.name || '');
    const price = typeof product.price === 'number' ? product.price : 0;
    const stock = Number.isFinite(product.stock) ? Math.floor(product.stock) : 0;
    const image = String(product.image || '');
    const buyPrice = typeof product.buyPrice === 'number' ? product.buyPrice : 0;
    const productType = String(product.productType || 'item');

    console.log('[ProductDB.update] Updating:', { id, name, price, stock, image, buyPrice, productType });

    try {
      await database.runAsync(
        `UPDATE products SET name = ?, price = ?, stock = ?, image = ?, buy_price = ?, product_type = ?, updated_at = datetime('now') WHERE id = ?`,
        name, price, stock, image, buyPrice, productType, id
      );
      console.log('[ProductDB.update] Success');
    } catch (err) {
      console.error('[ProductDB.update] FAILED:', err);
      console.error('[ProductDB.update] Values:', { id, name, price, stock, image, buyPrice, productType });
      throw err;
    }
  },

  async delete(id: string) {
    const database = getDb();
    await database.runAsync('DELETE FROM products WHERE id = ?', id);
  },

  async hasSales(id: string): Promise<boolean> {
    const database = getDb();
    const result = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?',
      id
    );
    return (result?.count ?? 0) > 0;
  },
};

// Sale operations (scoped by business)
export const SaleDB = {
  async getAll(businessId: string) {
    const database = getDb();
    const result = await database.getAllAsync<any>(
      'SELECT * FROM sales WHERE business_id = ? ORDER BY timestamp DESC',
      businessId
    );
    return result;
  },

  // Paginated sales with cursor-based pagination
  async getPaginated(businessId: string, options: PaginationOptions = {}): Promise<PaginatedResult<any>> {
    const database = getDb();
    const limit = options.limit || 50;
    const { cursor, fromDate, toDate, searchQuery } = options;

    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (cursor) {
      whereClause += ' AND id < ?';
      params.push(cursor);
    }

    if (fromDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(fromDate.toISOString());
    }

    if (toDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(toDate.toISOString());
    }

    if (searchQuery) {
      // Search in sale ID or join with items to search by product name
      whereClause += ' AND (id LIKE ? OR CAST(total AS TEXT) LIKE ?)';
      const search = `%${searchQuery}%`;
      params.push(search, search);
    }

    const query = `SELECT * FROM sales ${whereClause} ORDER BY id DESC LIMIT ${limit + 1}`;
    const result = await database.getAllAsync<any>(query, ...params);

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, -1) : result;
    const lastItem = data[data.length - 1];

    return {
      data,
      hasNextPage,
      cursor: lastItem?.id,
    };
  },

  // Get total count with optional filters
  async getCount(businessId: string, options: { fromDate?: Date; toDate?: Date } = {}): Promise<number> {
    const database = getDb();
    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (options.fromDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(options.fromDate.toISOString());
    }

    if (options.toDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(options.toDate.toISOString());
    }

    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales ${whereClause}`,
      ...params
    );
    return result?.count ?? 0;
  },

  // Get sales with items in a single query (avoids N+1 problem)
  async getAllWithItems(businessId: string, limit: number = 50, cursor?: string): Promise<PaginatedResult<any>> {
    const database = getDb();
    let whereClause = 'WHERE s.business_id = ?';
    const params: any[] = [businessId];

    if (cursor) {
      whereClause += ' AND s.id < ?';
      params.push(cursor);
    }

    // First, get sale IDs at the sale level (not row level)
    const saleIdsQuery = `
      SELECT DISTINCT s.id as sale_id
      FROM sales s
      ${whereClause}
      ORDER BY s.id DESC
      LIMIT ${limit + 1}
    `;
    const saleIdsResult = await database.getAllAsync<{ sale_id: string }>(saleIdsQuery, ...params);
    const saleIds = saleIdsResult.map(r => r.sale_id);

    if (saleIds.length === 0) {
      return { data: [], hasNextPage: false, cursor: undefined };
    }

    const hasNextPage = saleIds.length > limit;
    const idsToFetch = hasNextPage ? saleIds.slice(0, limit) : saleIds;
    const nextCursor = hasNextPage ? idsToFetch[idsToFetch.length - 1] : undefined;

    // Now fetch all items for those sale IDs in one query
    const placeholders = idsToFetch.map(() => '?').join(',');
    const itemsQuery = `
      SELECT
        s.id as sale_id, s.business_id, s.subtotal, s.tax, s.tax_rate, s.total,
        s.payment_method, s.payment_status, s.timestamp, s.created_at,
        si.id as item_id, si.product_id, si.product_name, si.price as item_price,
        si.quantity, si.total as item_total, si.buy_price
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.id IN (${placeholders})
      ORDER BY s.id DESC, si.id ASC
    `;

    const result = await database.getAllAsync<any>(itemsQuery, ...idsToFetch);

    // Group items by sale
    const salesMap = new Map<string, any>();
    for (const row of result) {
      if (!salesMap.has(row.sale_id)) {
        salesMap.set(row.sale_id, {
          id: row.sale_id,
          business_id: row.business_id,
          subtotal: row.subtotal,
          tax: row.tax,
          tax_rate: row.tax_rate,
          total: row.total,
          payment_method: row.payment_method,
          payment_status: row.payment_status,
          timestamp: row.timestamp,
          created_at: row.created_at,
          items: [],
        });
      }
      
      if (row.item_id) {
        salesMap.get(row.sale_id).items.push({
          id: row.item_id,
          product_id: row.product_id,
          product_name: row.product_name,
          price: row.item_price,
          quantity: row.quantity,
          total: row.item_total,
          buy_price: row.buy_price,
        });
      }
    }

    const sales = Array.from(salesMap.values());

    return {
      data: sales,
      hasNextPage,
      cursor: nextCursor,
    };
  },

  async getById(id: string) {
    const database = getDb();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM sales WHERE id = ?',
      id
    );
    return result;
  },

  async getItems(saleId: string) {
    const database = getDb();
    const result = await database.getAllAsync<any>(
      'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id',
      saleId
    );
    return result;
  },

  async create(sale: {
    id: string;
    businessId: string;
    subtotal: number;
    tax: number;
    taxRate: number;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    timestamp: string;
    items: {
      id: string;
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      total: number;
      buyPrice?: number;
    }[];
  }) {
    const database = getDb();
    // Use a transaction for atomicity
    await database.withTransactionAsync(async () => {
      // Round monetary values to prevent floating-point drift
      const subtotal = parseFloat((Math.round(sale.subtotal * 100) / 100).toFixed(2));
      const tax = parseFloat((Math.round(sale.tax * 100) / 100).toFixed(2));
      const total = parseFloat((Math.round(sale.total * 100) / 100).toFixed(2));

      // Insert sale
      await database.runAsync(
        `INSERT INTO sales (id, business_id, subtotal, tax, tax_rate, total, payment_method, payment_status, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sale.id,
        sale.businessId,
        subtotal,
        tax,
        sale.taxRate,
        total,
        sale.paymentMethod,
        sale.paymentStatus,
        sale.timestamp
      );

      // Insert sale items
      for (const item of sale.items) {
        const itemTotal = parseFloat((Math.round(item.total * 100) / 100).toFixed(2));
        const itemPrice = parseFloat((Math.round(item.price * 100) / 100).toFixed(2));
        await database.runAsync(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name, price, quantity, total, buy_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          item.id,
          sale.id,
          item.productId,
          item.productName,
          itemPrice,
          item.quantity,
          itemTotal,
          item.buyPrice || 0
        );

        // Deduct stock (skip for services)
        await database.runAsync(
          'UPDATE products SET stock = stock - ?, updated_at = datetime(\'now\') WHERE id = ? AND product_type != \'service\'',
          item.quantity,
          item.productId
        );
      }
    });
  },

  async update(saleId: string, updates: {
    paymentMethod?: string;
    paymentStatus?: string;
    taxRate?: number;
    items?: {
      id: string;
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      total: number;
      buyPrice?: number;
    }[];
  }) {
    const database = getDb();
    await database.withTransactionAsync(async () => {
      // Get original sale items to restore stock
      const originalItems = await this.getItems(saleId);

      // Restore original stock (skip for services)
      for (const item of originalItems) {
        await database.runAsync(
          'UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND product_type != \'service\'',
          item.quantity,
          item.product_id
        );
      }

      // Delete original sale items
      await database.runAsync('DELETE FROM sale_items WHERE sale_id = ?', saleId);

      // Update payment method, tax rate and payment status if provided
      if (updates.paymentMethod || updates.paymentStatus || updates.taxRate !== undefined) {
        const sale = await this.getById(saleId);
        await database.runAsync(
          'UPDATE sales SET payment_method = ?, payment_status = ?, tax_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          updates.paymentMethod ?? sale.payment_method,
          updates.paymentStatus ?? sale.payment_status ?? 'paid',
          updates.taxRate ?? sale.tax_rate ?? 0,
          saleId
        );
      }

      // Insert new items and deduct stock
      if (updates.items) {
        for (const item of updates.items) {
          const roundedPrice = parseFloat((Math.round(item.price * 100) / 100).toFixed(2));
          const roundedTotal = parseFloat((Math.round(item.total * 100) / 100).toFixed(2));
          await database.runAsync(
            `INSERT INTO sale_items (id, sale_id, product_id, product_name, price, quantity, total, buy_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            item.id,
            saleId,
            item.productId,
            item.productName,
            roundedPrice,
            item.quantity,
            roundedTotal,
            item.buyPrice || 0
          );

          await database.runAsync(
            'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND product_type != \'service\'',
            item.quantity,
            item.productId
          );
        }

        // Recalculate totals using the sale's actual tax_rate
        const subtotal = updates.items.reduce((sum, item) => sum + item.total, 0);
        const sale = await this.getById(saleId);
        const taxRate = updates.taxRate ?? sale.tax_rate ?? 0;
        const tax = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
        const total = parseFloat((subtotal + tax).toFixed(2));

        await database.runAsync(
          'UPDATE sales SET subtotal = ?, tax = ?, total = ?, tax_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          subtotal,
          tax,
          total,
          taxRate,
          saleId
        );
      }
    });
  },

  async delete(saleId: string) {
    const database = getDb();
    await database.withTransactionAsync(async () => {
      // Get sale items to restore stock
      const items = await this.getItems(saleId);

      // Restore stock (skip for services)
      for (const item of items) {
        await database.runAsync(
          'UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND product_type != \'service\'',
          item.quantity,
          item.product_id
        );
      }

      // Delete sale items first (foreign key constraint)
      await database.runAsync('DELETE FROM sale_items WHERE sale_id = ?', saleId);

      // Delete sale
      await database.runAsync('DELETE FROM sales WHERE id = ?', saleId);
    });
  },

  async getDailyTotal(businessId: string, date: string) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(total) as total FROM sales
       WHERE business_id = ? AND DATE(timestamp) = DATE(?)`,
      businessId,
      date
    );
    return result?.total ?? 0;
  },

  async getTodayCount(businessId: string) {
    const database = getDb();
    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales
       WHERE business_id = ? AND DATE(timestamp) = DATE('now')`,
      businessId
    );
    return result?.count ?? 0;
  },

  async getAllTimeTotal(businessId: string) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE business_id = ?`,
      businessId
    );
    return result?.total ?? 0;
  },

  async getAllTimeCount(businessId: string) {
    const database = getDb();
    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales WHERE business_id = ?`,
      businessId
    );
    return result?.count ?? 0;
  },

  async getMonthlyTotal(businessId: string, year: number, month: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(total) as total FROM sales
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
      businessId,
      String(year),
      String(month).padStart(2, '0')
    );
    return result?.total ?? 0;
  },

  async getMonthlyIncomeTotal(businessId: string, year: number, month: number) {
    const database = getDb();
    const salesResult = await database.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) as total FROM sales
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
      businessId, String(year), String(month).padStart(2, '0')
    );
    const incomeResult = await database.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM income
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
      businessId, String(year), String(month).padStart(2, '0')
    );
    return (salesResult?.total ?? 0) + (incomeResult?.total ?? 0);
  },

  async getMonthlyStockCost(businessId: string, year: number, month: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(s.buy_price * s.quantity) as total FROM sale_items s
       JOIN sales sa ON s.sale_id = sa.id
       WHERE sa.business_id = ? AND STRFTIME('%Y', sa.timestamp) = ? AND STRFTIME('%m', sa.timestamp) = ?`,
      businessId,
      String(year),
      String(month).padStart(2, '0')
    );
    return result?.total ?? 0;
  },

  async getYearlyStockCost(businessId: string, year: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(s.buy_price * s.quantity) as total FROM sale_items s
       JOIN sales sa ON s.sale_id = sa.id
       WHERE sa.business_id = ? AND STRFTIME('%Y', sa.timestamp) = ?`,
      businessId,
      String(year)
    );
    return result?.total ?? 0;
  },

  async getYearlySales(businessId: string, year: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(total) as total FROM sales
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ?`,
      businessId,
      String(year)
    );
    return result?.total ?? 0;
  },

  async getMonthlySalesCount(businessId: string, year: number, month: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
      businessId,
      String(year),
      String(month).padStart(2, '0')
    );
    return result?.count ?? 0;
  },

  async getTopProducts(businessId: string, year: number, month: number) {
    const database = getDb();
    return await database.getAllAsync<any>(
      `SELECT s.product_name, SUM(s.quantity) as total_qty, SUM(s.total) as total_revenue
       FROM sale_items s
       JOIN sales sa ON s.sale_id = sa.id
       WHERE sa.business_id = ? AND STRFTIME('%Y', sa.timestamp) = ? AND STRFTIME('%m', sa.timestamp) = ?
       GROUP BY s.product_id
       ORDER BY total_revenue DESC
       LIMIT 5`,
      businessId,
      String(year),
      String(month).padStart(2, '0')
    );
  },
};

// Expense operations (scoped by business)
export const ExpenseDB = {
  async getAll(businessId: string) {
    const database = getDb();
    const result = await database.getAllAsync<any>(
      'SELECT * FROM expenses WHERE business_id = ? ORDER BY timestamp DESC',
      businessId
    );
    return result;
  },

  // Paginated expenses with server-side date filtering
  async getPaginated(businessId: string, options: PaginationOptions = {}): Promise<PaginatedResult<any>> {
    const database = getDb();
    const limit = options.limit || 50;
    const { cursor, fromDate, toDate, searchQuery } = options;

    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (cursor) {
      whereClause += ' AND id < ?';
      params.push(cursor);
    }

    if (fromDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(fromDate.toISOString());
    }

    if (toDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(toDate.toISOString());
    }

    if (searchQuery) {
      whereClause += ' AND (title LIKE ? OR description LIKE ? OR expense_type LIKE ?)';
      const search = `%${searchQuery}%`;
      params.push(search, search, search);
    }

    const query = `SELECT * FROM expenses ${whereClause} ORDER BY timestamp DESC LIMIT ${limit + 1}`;
    const result = await database.getAllAsync<any>(query, ...params);

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, -1) : result;
    const lastItem = data[data.length - 1];

    return {
      data,
      hasNextPage,
      cursor: lastItem?.id,
    };
  },

  // Get expense count with filters
  async getCount(businessId: string, options: { fromDate?: Date; toDate?: Date } = {}): Promise<number> {
    const database = getDb();
    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (options.fromDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(options.fromDate.toISOString());
    }

    if (options.toDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(options.toDate.toISOString());
    }

    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM expenses ${whereClause}`,
      ...params
    );
    return result?.count ?? 0;
  },

  async create(expense: {
    id: string;
    businessId: string;
    title: string;
    description?: string;
    amount: number;
    expenseType: string;
    timestamp: string;
  }) {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO expenses (id, business_id, title, description, amount, expense_type, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      expense.id,
      expense.businessId,
      expense.title,
      expense.description || '',
      expense.amount,
      expense.expenseType,
      expense.timestamp
    );
  },

  async delete(id: string) {
    const database = getDb();
    await database.runAsync('DELETE FROM expenses WHERE id = ?', id);
  },

  async getMonthlyTotal(businessId: string, year: number, month: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total FROM expenses
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
      businessId,
      String(year),
      String(month).padStart(2, '0')
    );
    return result?.total ?? 0;
  },

  async getYearlyTotal(businessId: string, year: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total FROM expenses
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ?`,
      businessId,
      String(year)
    );
    return result?.total ?? 0;
  },
};

// Income operations (scoped by business)
export const IncomeDB = {
  async getAll(businessId: string) {
    const database = getDb();
    return await database.getAllAsync<any>(
      'SELECT * FROM income WHERE business_id = ? ORDER BY timestamp DESC',
      businessId
    );
  },

  // Paginated income with server-side date filtering
  async getPaginated(businessId: string, options: PaginationOptions = {}): Promise<PaginatedResult<any>> {
    const database = getDb();
    const limit = options.limit || 50;
    const { cursor, fromDate, toDate, searchQuery } = options;

    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (cursor) {
      whereClause += ' AND id < ?';
      params.push(cursor);
    }

    if (fromDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(fromDate.toISOString());
    }

    if (toDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(toDate.toISOString());
    }

    if (searchQuery) {
      whereClause += ' AND title LIKE ?';
      params.push(`%${searchQuery}%`);
    }

    const query = `SELECT * FROM income ${whereClause} ORDER BY timestamp DESC LIMIT ${limit + 1}`;
    const result = await database.getAllAsync<any>(query, ...params);

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, -1) : result;
    const lastItem = data[data.length - 1];

    return {
      data,
      hasNextPage,
      cursor: lastItem?.id,
    };
  },

  // Get income count with filters
  async getCount(businessId: string, options: { fromDate?: Date; toDate?: Date } = {}): Promise<number> {
    const database = getDb();
    let whereClause = 'WHERE business_id = ?';
    const params: any[] = [businessId];

    if (options.fromDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(options.fromDate.toISOString());
    }

    if (options.toDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(options.toDate.toISOString());
    }

    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM income ${whereClause}`,
      ...params
    );
    return result?.count ?? 0;
  },

  async create(income: { id: string; businessId: string; title: string; amount: number; timestamp: string }) {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO income (id, business_id, title, amount, timestamp) VALUES (?, ?, ?, ?, ?)`,
      income.id, income.businessId, income.title, income.amount, income.timestamp
    );
  },

  async delete(id: string) {
    const database = getDb();
    await database.runAsync('DELETE FROM income WHERE id = ?', id);
  },

  async getMonthlyTotal(businessId: string, year: number, month: number) {
    const database = getDb();
    const result = await database.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total FROM income
       WHERE business_id = ? AND STRFTIME('%Y', timestamp) = ? AND STRFTIME('%m', timestamp) = ?`,
      businessId,
      String(year),
      String(month).padStart(2, '0')
    );
    return result?.total ?? 0;
  },
};

// Settings (key-value store for capital, etc.)
export const SettingsDB = {
  async get(key: string): Promise<string | null> {
    const database = getDb();
    const result = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      key
    );
    return result?.value ?? null;
  },

  async set(key: string, value: string) {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      key, value, value
    );
  },
};

// Export all database modules
export * from './BusinessManager';
