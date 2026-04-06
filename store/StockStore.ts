import { ProductDB, SaleDB, ExpenseDB, IncomeDB, SettingsDB, getCurrentBusinessId, getCurrentBusiness, setBusinessCapital, updateBusiness } from '@/database/db';
import { getDb } from '@/database/database-instance';
import { queryCache, cachedQuery } from './QueryCache';
import { CartItem, PaymentMethod, SaleRecord, SoldItem, Product, ExpenseRecord, ExpenseType, PaginatedResult, PaginationOptions } from '@/types';

export interface IncomeRecord {
  id: string;
  title: string;
  amount: number;
  timestamp: Date;
}

export const StockStore = {
  // Business management
  getCurrentBusiness: async () => await getCurrentBusiness(),
  getCurrentBusinessId: async () => await getCurrentBusinessId(),

  getProducts: async (): Promise<Product[]> => {
    const businessId = await getCurrentBusinessId();
    const rows = await ProductDB.getAll(businessId);
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      image: row.image,
      stock: row.stock,
      buyPrice: row.buy_price,
      productType: row.product_type || 'item',
    }));
  },

  getProduct: async (id: string): Promise<Product | undefined> => {
    const row = await ProductDB.getById(id);
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      price: row.price,
      image: row.image,
      stock: row.stock,
      buyPrice: row.buy_price,
      productType: row.product_type || 'item',
    };
  },

  getProductStock: async (id: string): Promise<number> => {
    return await ProductDB.getStock(id);
  },

  // Business info (from businesses table)
  getBusinessInfo: async (): Promise<{ name: string; accountNumber: string; accountName: string; viberNumber: string }> => {
    const business = await getCurrentBusiness();
    return {
      name: business?.name ?? '',
      accountNumber: business?.accountNumber ?? '',
      accountName: business?.accountName ?? '',
      viberNumber: business?.viberNumber ?? '',
    };
  },

  setBusinessAccountNumber: async (value: string): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    await updateBusiness(businessId, { accountNumber: value });
  },

  setBusinessAccountName: async (value: string): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    await updateBusiness(businessId, { accountName: value });
  },

  setBusinessViberNumber: async (value: string): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    await updateBusiness(businessId, { viberNumber: value });
  },

  getSalesHistory: async (): Promise<SaleRecord[]> => {
    const businessId = await getCurrentBusinessId();
    const sales = await SaleDB.getAll(businessId);
    const records: SaleRecord[] = [];

    for (const sale of sales) {
      const items = await SaleDB.getItems(sale.id);
      records.push({
        id: sale.id,
        items: items.map((item: any) => ({
          id: item.product_id,
          name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
        })),
        subtotal: sale.subtotal,
        tax: sale.tax,
        taxRate: sale.tax_rate ?? 0,
        total: sale.total,
        paymentMethod: sale.payment_method as PaymentMethod,
        paymentStatus: (sale.payment_status as 'paid' | 'unpaid') ?? 'paid',
        timestamp: new Date(sale.timestamp),
      });
    }

    return records;
  },

  createSale: async (
    items: CartItem[],
    paymentMethod: PaymentMethod,
    taxRate: number = 0,
    paymentStatus: 'paid' | 'unpaid' = 'paid'
  ): Promise<SaleRecord | null> => {
    if (items.length === 0) return null;
    const businessId = await getCurrentBusinessId();

    // Check stock availability first (skip for services)
    for (const item of items) {
      const product = await StockStore.getProduct(item.id);
      const isService = product?.productType === 'service';
      if (!isService) {
        const available = await StockStore.getProductStock(item.id);
        if (available < item.quantity) {
          return null;
        }
      }
    }

    // Fetch products to get buy prices
    const products = await StockStore.getProducts();

    const rawSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const rawTax = rawSubtotal * (taxRate / 100);
    const subtotal = parseFloat((Math.round(rawSubtotal * 100) / 100).toFixed(2));
    const tax = parseFloat((Math.round(rawTax * 100) / 100).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Use timestamp-based ID to avoid conflicts
    const saleId = `#${Date.now()}`;

    const dbItems = items.map((item) => {
      const product = products.find((p) => p.id === item.id);
      return {
        id: `${saleId}-${item.id}`,
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        buyPrice: product?.buyPrice ?? 0,
      };
    });

    await SaleDB.create({
      id: saleId,
      businessId,
      subtotal,
      tax,
      taxRate,
      total,
      paymentMethod,
      paymentStatus,
      timestamp: new Date().toISOString(),
      items: dbItems,
    });

    const sale: SaleRecord = {
      id: saleId,
      items: items.map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          buyPrice: product?.buyPrice ?? 0,
        };
      }),
      subtotal,
      tax,
      taxRate,
      total,
      paymentMethod,
      paymentStatus,
      timestamp: new Date(),
    };

    // Invalidate caches
    queryCache.clearMatching('sales');
    queryCache.clearMatching('count');

    return sale;
  },

  deleteSale: async (saleId: string): Promise<boolean> => {
    try {
      await SaleDB.delete(saleId);
      // Invalidate all sales and count caches
      queryCache.clearMatching('sales');
      queryCache.clearMatching('count');
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      return false;
    }
  },

  updateSalePayment: async (
    saleId: string,
    paymentMethod: PaymentMethod
  ): Promise<boolean> => {
    try {
      await SaleDB.update(saleId, { paymentMethod });
      return true;
    } catch (error) {
      console.error('Error updating sale:', error);
      return false;
    }
  },

  updateSaleItems: async (
    saleId: string,
    items: CartItem[],
    taxRate: number = 0
  ): Promise<SaleRecord | null> => {
    try {
      const rawSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const rawTax = rawSubtotal * (taxRate / 100);
      const rawTotal = rawSubtotal + rawTax;
      const subtotal = parseFloat((Math.round(rawSubtotal * 100) / 100).toFixed(2));
      const tax = parseFloat((Math.round(rawTax * 100) / 100).toFixed(2));
      const total = parseFloat((Math.round(rawTotal * 100) / 100).toFixed(2));

      // Get existing sale to preserve payment method
      const existingSale = await SaleDB.getById(saleId);
      if (!existingSale) return null;

      const dbItems = items.map((item) => ({
        id: `${saleId}-${item.id}`,
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      }));

      await SaleDB.update(saleId, {
        paymentMethod: existingSale.payment_method,
        paymentStatus: existingSale.payment_status,
        taxRate,
        items: dbItems,
      });

      return {
        id: saleId,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        })),
        subtotal,
        tax,
        taxRate,
        total,
        paymentMethod: existingSale.payment_method as PaymentMethod,
        paymentStatus: (existingSale.payment_status as 'paid' | 'unpaid') ?? 'paid',
        timestamp: new Date(existingSale.timestamp),
      };
    } catch (error) {
      console.error('Error updating sale items:', error);
      return null;
    }
  },

  // Expense methods
  getExpenses: async (): Promise<ExpenseRecord[]> => {
    const businessId = await getCurrentBusinessId();
    const rows = await ExpenseDB.getAll(businessId);
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      amount: row.amount,
      expenseType: row.expense_type as ExpenseType,
      timestamp: new Date(row.timestamp),
    }));
  },

  addExpense: async (expense: Omit<ExpenseRecord, 'id'>): Promise<ExpenseRecord> => {
    const id = `EXP-${Date.now()}`;
    const businessId = await getCurrentBusinessId();
    await ExpenseDB.create({
      id,
      businessId,
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      expenseType: expense.expenseType,
      timestamp: expense.timestamp.toISOString(),
    });
    return { id, ...expense };
  },

  deleteExpense: async (id: string): Promise<boolean> => {
    try {
      await ExpenseDB.delete(id);
      return true;
    } catch {
      return false;
    }
  },

  deleteExpensesByTitle: async (title: string, expenseType: string): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    const db = getDb();
    await db.runAsync(
      `DELETE FROM expenses WHERE business_id = ? AND title = ? AND expense_type = ?`,
      businessId,
      title,
      expenseType
    );
  },

  updateExpense: async (id: string, data: { title: string; amount: number; expenseType: string; timestamp: Date }): Promise<void> => {
    const db = getDb();
    await db.runAsync(
      `UPDATE expenses SET title = ?, amount = ?, expense_type = ?, timestamp = ? WHERE id = ?`,
      data.title, data.amount, data.expenseType, data.timestamp.toISOString(), id
    );
  },

  // Product CRUD
  createProduct: async (product: Product): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    await ProductDB.create({
      id: product.id,
      businessId,
      name: product.name,
      price: product.price,
      stock: product.productType === 'service' ? 0 : product.stock,
      image: product.image || undefined,
      buyPrice: product.buyPrice ?? 0,
      productType: product.productType || 'item',
    });
  },

  updateProduct: async (product: Product): Promise<void> => {
    await ProductDB.update({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.productType === 'service' ? 0 : product.stock,
      image: product.image || undefined,
      buyPrice: product.buyPrice ?? 0,
      productType: product.productType || 'item',
    });
  },

  deleteProduct: async (id: string): Promise<boolean> => {
    try {
      await ProductDB.delete(id);
      queryCache.clearMatching('products');
      queryCache.clearMatching('count');
      return true;
    } catch {
      return false;
    }
  },

  productHasSales: async (id: string): Promise<boolean> => {
    return await ProductDB.hasSales(id);
  },

  updateStock: async (productId: string, delta: number): Promise<void> => {
    await ProductDB.updateStock(productId, delta);
  },

  getMonthlyStockCost: async (year: number, month: number): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getMonthlyStockCost(businessId, year, month);
  },

  getYearlyStockCost: async (year: number): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getYearlyStockCost(businessId, year);
  },

  // Report methods
  getYearlySalesTotal: async (year: number): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getYearlySales(businessId, year);
  },

  getYearlyExpensesTotal: async (year: number): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await ExpenseDB.getYearlyTotal(businessId, year);
  },

  getMonthlySalesCount: async (year: number, month: number): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getMonthlySalesCount(businessId, year, month);
  },

  getTopProducts: async (year: number, month: number) => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getTopProducts(businessId, year, month);
  },

  getTotalStockValue: async (): Promise<number> => {
    const products = await StockStore.getProducts();
    return products.reduce((sum, p) => sum + p.price * p.stock, 0);
  },

  getTotalStockCostValue: async (): Promise<number> => {
    const products = await StockStore.getProducts();
    return products.reduce((sum, p) => sum + (p.buyPrice ?? 0) * p.stock, 0);
  },

  // Income methods
  getIncomes: async (): Promise<IncomeRecord[]> => {
    const businessId = await getCurrentBusinessId();
    const rows = await IncomeDB.getAll(businessId);
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      amount: row.amount,
      timestamp: new Date(row.timestamp),
    }));
  },

  addIncome: async (income: Omit<IncomeRecord, 'id'>): Promise<IncomeRecord> => {
    const id = `INC-${Date.now()}`;
    const businessId = await getCurrentBusinessId();
    await IncomeDB.create({ id, businessId, title: income.title, amount: income.amount, timestamp: income.timestamp.toISOString() });
    return { id, ...income };
  },

  deleteIncome: async (id: string): Promise<boolean> => {
    try {
      await IncomeDB.delete(id);
      return true;
    } catch {
      return false;
    }
  },

  updateIncome: async (id: string, data: { title: string; amount: number; timestamp: Date }): Promise<void> => {
    const db = getDb();
    await db.runAsync(
      `UPDATE income SET title = ?, amount = ?, timestamp = ? WHERE id = ?`,
      data.title, data.amount, data.timestamp.toISOString(), id
    );
  },

  getMonthlyIncomeTotal: async (year: number, month: number): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await IncomeDB.getMonthlyTotal(businessId, year, month);
  },

  // Settings (generic key-value)
  getSetting: async (key: string): Promise<string> => {
    return (await SettingsDB.get(key)) || '';
  },

  setSetting: async (key: string, value: string): Promise<void> => {
    await SettingsDB.set(key, value);
  },

  // Capital settings (now per business)
  getCapital: async (): Promise<number> => {
    const business = await getCurrentBusiness();
    return business?.capital ?? 0;
  },

  setCapital: async (amount: number): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    await setBusinessCapital(businessId, amount);
  },

  getBusinessName: async (): Promise<string> => {
    const business = await getCurrentBusiness();
    return business?.name ?? '';
  },

  // Get recent sales with items (optimized for dashboard)
  getRecentSales: async (limit: number = 20): Promise<SaleRecord[]> => {
    const businessId = await getCurrentBusinessId();
    const result = await SaleDB.getAllWithItems(businessId, limit);

    return result.data.map((sale: any) => ({
      id: sale.id,
      items: sale.items.map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        buyPrice: item.buy_price,
      })),
      subtotal: sale.subtotal,
      tax: sale.tax,
      taxRate: sale.tax_rate ?? 0,
      total: sale.total,
      paymentMethod: sale.payment_method as PaymentMethod,
      paymentStatus: (sale.payment_status as 'paid' | 'unpaid') ?? 'paid',
      timestamp: new Date(sale.timestamp),
    }));
  },

  getTodayTotal: async (): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    const today = new Date().toISOString().split('T')[0];
    return await SaleDB.getDailyTotal(businessId, today);
  },

  getTodayCount: async (): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getTodayCount(businessId);
  },

  getAllTimeTotal: async (): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getAllTimeTotal(businessId);
  },

  getAllTimeCount: async (): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getAllTimeCount(businessId);
  },

  getNonStockExpensesTotal: async (): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    const db = getDb();
    const result = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE business_id = ? AND expense_type != 'stock'",
      businessId
    );
    return result?.total ?? 0;
  },

  getLowStockCount: async (threshold: number = 5): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    const db = getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM products WHERE business_id = ? AND stock <= ? AND product_type = \'item\'',
      businessId, threshold
    );
    return result?.count ?? 0;
  },

  setBusinessName: async (name: string): Promise<void> => {
    const businessId = await getCurrentBusinessId();
    await updateBusiness(businessId, { name });
  },

  // ========== PAGINATION METHODS ==========

  // Get paginated sales with items
  getPaginatedSales: async (options: PaginationOptions = {}): Promise<PaginatedResult<SaleRecord>> => {
    const businessId = await getCurrentBusinessId();
    const result = await SaleDB.getAllWithItems(businessId, options.limit || 50, options.cursor);

    return {
      data: result.data.map((sale: any) => ({
        id: sale.id,
        items: sale.items.map((item: any) => ({
          id: item.product_id,
          name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
          buyPrice: item.buy_price,
        })),
        subtotal: sale.subtotal,
        tax: sale.tax,
        taxRate: sale.tax_rate ?? 0,
        total: sale.total,
        paymentMethod: sale.payment_method as PaymentMethod,
        paymentStatus: (sale.payment_status as 'paid' | 'unpaid') ?? 'paid',
        timestamp: new Date(sale.timestamp),
      })),
      hasNextPage: result.hasNextPage,
      total: result.data.length,
      cursor: result.cursor,
    };
  },

  // Get sales count with filters
  getSalesCount: async (options: { fromDate?: Date; toDate?: Date } = {}): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await SaleDB.getCount(businessId, options);
  },

  // Get paginated products
  getPaginatedProducts: async (options: PaginationOptions = {}): Promise<PaginatedResult<Product>> => {
    const businessId = await getCurrentBusinessId();
    const result = await ProductDB.getPaginated(businessId, options);

    return {
      data: result.data.map((row: any) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        image: row.image,
        stock: row.stock,
        buyPrice: row.buy_price,
        productType: row.product_type || 'item',
      })),
      hasNextPage: result.hasNextPage,
      total: result.data.length,
      cursor: result.cursor,
    };
  },

  // Get product count
  getProductCount: async (options: { searchQuery?: string } = {}): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await ProductDB.getCount(businessId, options);
  },

  // Get paginated low stock products
  getLowStockProducts: async (threshold: number = 5, limit: number = 50): Promise<PaginatedResult<Product>> => {
    const businessId = await getCurrentBusinessId();
    const result = await ProductDB.getLowStock(businessId, threshold, limit);

    return {
      data: result.data.map((row: any) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        image: row.image,
        stock: row.stock,
        buyPrice: row.buy_price,
        productType: row.product_type || 'item',
      })),
      hasNextPage: result.hasNextPage,
      cursor: result.cursor,
    };
  },

  // Get paginated expenses
  getPaginatedExpenses: async (options: PaginationOptions = {}): Promise<PaginatedResult<ExpenseRecord>> => {
    const businessId = await getCurrentBusinessId();
    const result = await ExpenseDB.getPaginated(businessId, options);

    return {
      data: result.data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        amount: row.amount,
        expenseType: row.expense_type as ExpenseType,
        timestamp: new Date(row.timestamp),
      })),
      hasNextPage: result.hasNextPage,
      total: result.data.length,
      cursor: result.cursor,
    };
  },

  // Get expense count
  getExpenseCount: async (options: { fromDate?: Date; toDate?: Date } = {}): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await ExpenseDB.getCount(businessId, options);
  },

  // Get recent expenses (optimized for dashboard)
  getRecentExpenses: async (limit: number = 50): Promise<ExpenseRecord[]> => {
    const businessId = await getCurrentBusinessId();
    const result = await ExpenseDB.getPaginated(businessId, { limit });

    return result.data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      amount: row.amount,
      expenseType: row.expense_type as ExpenseType,
      timestamp: new Date(row.timestamp),
    }));
  },

  // Get paginated income
  getPaginatedIncomes: async (options: PaginationOptions = {}): Promise<PaginatedResult<IncomeRecord>> => {
    const businessId = await getCurrentBusinessId();
    const result = await IncomeDB.getPaginated(businessId, options);

    return {
      data: result.data.map((row: any) => ({
        id: row.id,
        title: row.title,
        amount: row.amount,
        timestamp: new Date(row.timestamp),
      })),
      hasNextPage: result.hasNextPage,
      total: result.data.length,
      cursor: result.cursor,
    };
  },

  // Get income count
  getIncomeCount: async (options: { fromDate?: Date; toDate?: Date } = {}): Promise<number> => {
    const businessId = await getCurrentBusinessId();
    return await IncomeDB.getCount(businessId, options);
  },
};
