import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { zipSync, unzipSync } from 'fflate';
import { getDb } from '../database/database-instance';
import {
  ProductDB,
  SaleDB,
  ExpenseDB,
  IncomeDB,
  SettingsDB,
  getAllBusinesses,
} from '../database/db';

export interface BackupData {
  version: string;
  timestamp: string;
  appName: string;
  data: {
    businesses: any[];
    products: any[];
    sales: any[];
    saleItems: any[];
    expenses: any[];
    income: any[];
    settings: any[];
  };
}

function getTempDir(): string {
  return FileSystemLegacy.documentDirectory || '';
}

async function exportDatabase(): Promise<BackupData> {
  const businesses = await getAllBusinesses();
  const products: any[] = [];
  const sales: any[] = [];
  const saleItems: any[] = [];
  const expenses: any[] = [];
  const income: any[] = [];

  for (const business of businesses) {
    const bizProducts = await ProductDB.getAll(business.id);
    products.push(...(bizProducts || []));

    const bizSales = await SaleDB.getAll(business.id);
    sales.push(...(bizSales || []));

    for (const sale of bizSales) {
      const items = await SaleDB.getItems(sale.id);
      saleItems.push(...(items || []));
    }

    const bizExpenses = await ExpenseDB.getAll(business.id);
    expenses.push(...(bizExpenses || []));

    const bizIncome = await IncomeDB.getAll(business.id);
    income.push(...(bizIncome || []));
  }

  const settingsKeys = ['currentBusinessId'];
  const settings: any[] = [];
  for (const key of settingsKeys) {
    const value = await SettingsDB.get(key);
    if (value !== null) settings.push({ key, value });
  }

  return {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    appName: 'Yasir Sales',
    data: { businesses, products, sales, saleItems, expenses, income, settings },
  };
}

async function importDatabase(backupData: BackupData): Promise<void> {
  if (!backupData.data) throw new Error('Invalid backup data format');

  const { businesses, products, sales, saleItems, expenses, income, settings } = backupData.data;
  const db = getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sale_items;');
    await db.runAsync('DELETE FROM sales;');
    await db.runAsync('DELETE FROM expenses;');
    await db.runAsync('DELETE FROM income;');
    await db.runAsync('DELETE FROM products;');
    await db.runAsync('DELETE FROM businesses;');
    await db.runAsync('DELETE FROM settings;');

    if (businesses?.length) {
      for (const b of businesses) {
        await db.runAsync(
          `INSERT INTO businesses (id, name, account_number, account_name, viber_number, capital, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          b.id, b.name, b.account_number ?? null, b.account_name ?? null, b.viber_number ?? null, b.capital ?? 0, b.created_at ?? new Date().toISOString(), b.updated_at ?? new Date().toISOString()
        );
      }
    }

    if (products?.length) {
      for (const p of products) {
        await db.runAsync(
          `INSERT INTO products (id, business_id, name, price, stock, image, sku, buy_price, category, product_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, p.business_id, p.name, p.price, p.stock, p.image ?? null, p.sku ?? null, p.buy_price ?? null, p.category ?? null, p.product_type ?? 'item', p.created_at ?? new Date().toISOString(), p.updated_at ?? new Date().toISOString()
        );
      }
    }

    if (sales?.length) {
      for (const s of sales) {
        await db.runAsync(
          `INSERT INTO sales (id, business_id, subtotal, tax, tax_rate, total, payment_method, payment_status, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          s.id, s.business_id, s.subtotal, s.tax, s.tax_rate ?? 0, s.total, s.payment_method, s.payment_status ?? 'paid', s.timestamp, s.created_at ?? new Date().toISOString(), s.updated_at ?? new Date().toISOString()
        );
      }
    }

    if (saleItems?.length) {
      for (const item of saleItems) {
        await db.runAsync(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name, price, quantity, total, buy_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          item.id, item.sale_id, item.product_id, item.product_name, item.price, item.quantity, item.total, item.buy_price ?? 0
        );
      }
    }

    if (expenses?.length) {
      for (const e of expenses) {
        await db.runAsync(
          `INSERT INTO expenses (id, business_id, title, description, amount, expense_type, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          e.id, e.business_id, e.title, e.description ?? null, e.amount, e.expense_type, e.timestamp, e.created_at ?? new Date().toISOString()
        );
      }
    }

    if (income?.length) {
      for (const inc of income) {
        await db.runAsync(
          `INSERT INTO income (id, business_id, title, amount, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          inc.id, inc.business_id, inc.title, inc.amount, inc.timestamp, inc.created_at ?? new Date().toISOString()
        );
      }
    }

    if (settings?.length) {
      for (const setting of settings) {
        await db.runAsync(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          setting.key, setting.value, new Date().toISOString()
        );
      }
    }
  });
}

export async function createBackup(): Promise<string> {
  const backupData = await exportDatabase();
  const jsonString = JSON.stringify(backupData, null, 2);
  const zipData = zipSync({ 'yasir_backup.json': new TextEncoder().encode(jsonString) }, { level: 9 });

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const fileName = `yasir_backup_${dateStr}_${timeStr}.zip`;
  const cacheUri = `${getTempDir()}${fileName}`;

  // Use chunked encoding to avoid O(n²) string concatenation
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < zipData.length; i += CHUNK_SIZE) {
    const chunk = zipData.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  const binary = chunks.join('');
  const base64 = btoa(binary);

  await FileSystemLegacy.writeAsStringAsync(cacheUri, base64, { encoding: FileSystemLegacy.EncodingType.Base64 });
  return cacheUri;
}

export async function shareBackupFile(fileUri: string): Promise<void> {
  await Sharing.shareAsync(fileUri, { mimeType: 'application/zip', UTI: 'public.zip-archive' });
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/zip', copyToCacheDirectory: true });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

export async function restoreFromZip(fileUri: string): Promise<void> {
  const base64 = await FileSystemLegacy.readAsStringAsync(fileUri, { encoding: FileSystemLegacy.EncodingType.Base64 });
  // Use chunked decoding to avoid O(n²) string operations
  const CHUNK_SIZE = 8192;
  const binaryString = atob(base64);
  const zipData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += CHUNK_SIZE) {
    const chunk = binaryString.slice(i, i + CHUNK_SIZE);
    for (let j = 0; j < chunk.length; j++) {
      zipData[i + j] = chunk.charCodeAt(j);
    }
  }

  const files = unzipSync(zipData);
  const jsonFile = files['yasir_backup.json'];
  if (!jsonFile) throw new Error('Invalid backup file: missing yasir_backup.json');

  const jsonString = new TextDecoder().decode(jsonFile);
  const backupData = JSON.parse(jsonString) as BackupData;
  await importDatabase(backupData);
}

export async function backupAndShare(): Promise<void> {
  const fileUri = await createBackup();
  await shareBackupFile(fileUri);
}

export async function pickAndRestore(): Promise<boolean> {
  const fileUri = await pickBackupFile();
  if (!fileUri) return false;
  await restoreFromZip(fileUri);
  return true;
}
