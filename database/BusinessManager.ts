import { getDb } from './database-instance';
import * as SQLite from 'expo-sqlite';

export interface BusinessRecord {
  id: string;
  name: string;
  accountNumber?: string;
  accountName?: string;
  viberNumber?: string;
  capital: number;
  createdAt?: string;
  updatedAt?: string;
}

const CURRENT_BUSINESS_KEY = 'currentBusinessId';

/**
 * Get all businesses
 */
export async function getAllBusinesses(): Promise<BusinessRecord[]> {
  const db = getDb();
  
  try {
    const result = await db.getAllAsync<BusinessRecord>(
      'SELECT id, name, account_number as accountNumber, account_name as accountName, viber_number as viberNumber, capital, created_at as createdAt, updated_at as updatedAt FROM businesses ORDER BY name'
    );
    return result || [];
  } catch (error) {
    console.error('getAllBusinesses error:', error);
    return [];
  }
}

/**
 * Get a single business by ID
 */
export async function getBusinessById(id: string): Promise<BusinessRecord | null> {
  const db = getDb();
  
  try {
    const result = await db.getFirstAsync<BusinessRecord>(
      'SELECT id, name, account_number as accountNumber, account_name as accountName, viber_number as viberNumber, capital, created_at as createdAt, updated_at as updatedAt FROM businesses WHERE id = ?',
      id
    );
    return result;
  } catch (error) {
    console.error('getBusinessById error:', error);
    return null;
  }
}

/**
 * Create a new business
 */
export async function createBusiness(data: {
  name: string;
  accountNumber?: string;
  accountName?: string;
  viberNumber?: string;
  capital?: number;
}): Promise<string> {
  const db = getDb();
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2);

  try {
    await db.runAsync(
      `INSERT INTO businesses (id, name, account_number, account_name, viber_number, capital, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id,
      data.name || '',
      data.accountNumber || '',
      data.accountName || '',
      data.viberNumber || '',
      typeof data.capital === 'number' ? data.capital : 0
    );
  } catch (error) {
    console.error('createBusiness error:', error);
    throw error;
  }

  return id;
}

/**
 * Update business info
 */
export async function updateBusiness(id: string, data: {
  name?: string;
  accountNumber?: string;
  accountName?: string;
  viberNumber?: string;
  capital?: number;
}): Promise<void> {
  const db = getDb();

  const current = await getBusinessById(id);
  if (!current) throw new Error('Business not found');

  const newName = data.name !== undefined ? (data.name || current.name) : current.name;
  const newAccountNumber = data.accountNumber !== undefined ? (data.accountNumber || current.accountNumber) : current.accountNumber;
  const newAccountName = data.accountName !== undefined ? (data.accountName || current.accountName) : current.accountName;
  const newViberNumber = data.viberNumber !== undefined ? (data.viberNumber || current.viberNumber) : current.viberNumber;
  const newCapital = data.capital !== undefined ? data.capital : current.capital;

  await db.runAsync(
    `UPDATE businesses SET name = ?, account_number = ?, account_name = ?, viber_number = ?, capital = ?, updated_at = datetime('now') WHERE id = ?`,
    newName || '',
    newAccountNumber || '',
    newAccountName || '',
    newViberNumber || '',
    typeof newCapital === 'number' ? newCapital : 0,
    id
  );
}

/**
 * Delete a business and all its data
 */
export async function deleteBusiness(id: string): Promise<void> {
  const db = getDb();

  // Prevent deleting the last business
  const all = await getAllBusinesses();
  if (all.length <= 1) {
    throw new Error('Cannot delete the only business');
  }

  // Delete all related data explicitly (foreign keys are disabled)
  await db.runAsync('DELETE FROM products WHERE business_id = ?', id);
  await db.runAsync('DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE business_id = ?)', id);
  await db.runAsync('DELETE FROM sales WHERE business_id = ?', id);
  await db.runAsync('DELETE FROM expenses WHERE business_id = ?', id);
  await db.runAsync('DELETE FROM income WHERE business_id = ?', id);

  // Finally delete the business
  await db.runAsync('DELETE FROM businesses WHERE id = ?', id);

  // If we deleted the current business, switch to another
  const currentId = await getCurrentBusinessId();
  if (currentId === id) {
    const remaining = await getAllBusinesses();
    if (remaining.length > 0) {
      await setCurrentBusinessId(remaining[0].id);
    }
  }
}

/**
 * Get current active business ID from settings
 */
export async function getCurrentBusinessId(): Promise<string> {
  const db = getDb();
  
  try {
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      CURRENT_BUSINESS_KEY
    );

    if (result?.value) return result.value;

    // If no current business set, find the first one
    const businesses = await getAllBusinesses();
    if (businesses.length > 0) {
      await setCurrentBusinessId(businesses[0].id);
      return businesses[0].id;
    }

    // Create default business
    const defaultId = 'default';
    await db.runAsync(
      `INSERT OR IGNORE INTO businesses (id, name, capital, created_at, updated_at)
       VALUES (?, 'My Business', 0, datetime('now'), datetime('now'))`,
      defaultId
    );
    await setCurrentBusinessId(defaultId);
    return defaultId;
  } catch (error) {
    console.error('getCurrentBusinessId error:', error);
    throw error;
  }
}

/**
 * Set current active business
 */
export async function setCurrentBusinessId(id: string): Promise<void> {
  const db = getDb();

  try {
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      CURRENT_BUSINESS_KEY, id, id
    );
  } catch (error) {
    console.error('setCurrentBusinessId error:', error);
    throw error;
  }
}

/**
 * Get current business record
 */
export async function getCurrentBusiness(): Promise<BusinessRecord | null> {
  const id = await getCurrentBusinessId();
  return await getBusinessById(id);
}

/**
 * Set business capital
 */
export async function setBusinessCapital(id: string, capital: number): Promise<void> {
  const db = getDb();
  
  try {
    await db.runAsync(
      'UPDATE businesses SET capital = ?, updated_at = datetime(\'now\') WHERE id = ?',
      typeof capital === 'number' ? capital : 0,
      id
    );
  } catch (error) {
    console.error('setBusinessCapital error:', error);
    throw error;
  }
}
