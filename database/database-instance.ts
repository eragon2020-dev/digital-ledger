/**
 * Database singleton - breaks circular dependency between db.ts and BusinessManager.ts
 */
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

// CHANGE THIS VERSION NUMBER to force a completely fresh database
const DB_VERSION = 'v4';
const DB_NAME = `yasir_${DB_VERSION}.db`;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    console.log('[getDb] Opening database:', DB_NAME);
    _db = SQLite.openDatabaseSync(DB_NAME);
    console.log('[getDb] Database opened successfully');
    
    // Disable foreign key enforcement by default
    try {
      _db.execSync('PRAGMA foreign_keys=OFF;');
      console.log('[getDb] Foreign keys disabled');
    } catch (err) {
      console.warn('[getDb] Could not disable foreign keys:', err);
    }
  }
  return _db;
}

export function resetDb() {
  _db = null;
  console.log('[resetDb] Database instance reset');
}
