import React, { createContext, useContext, useEffect, useState } from 'react';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { initDatabase } from '@/database/db';

interface DatabaseContextType {
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
});

async function copyPreseededDatabase(): Promise<boolean> {
  // Always skip preseeded database - it has outdated schema
  console.log('Skipping preseeded database (outdated schema)');
  return false;
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        // Check if a valid database exists (check both v3 and v4)
        const dbDir = FileSystemLegacy.documentDirectory + 'SQLite/';
        const dbPathV4 = dbDir + 'yasir_v4.db';
        const dbPathV3 = dbDir + 'yasir_v3.db';
        
        const v4Exists = await FileSystemLegacy.getInfoAsync(dbPathV4);
        const v3Exists = await FileSystemLegacy.getInfoAsync(dbPathV3);
        
        if (v4Exists.exists) {
          // Use the newer v4 database
          console.log('Opening v4 database (user data preserved)');
          await initDatabase(false);
        } else if (v3Exists.exists) {
          // Migrate from v3 - delete old and create fresh v4
          console.log('Found v3 database, migrating to v4...');
          try {
            await FileSystemLegacy.deleteAsync(dbPathV3, { idempotent: true });
            const walExists = await FileSystemLegacy.getInfoAsync(dbPathV3 + '-wal');
            if (walExists.exists) await FileSystemLegacy.deleteAsync(dbPathV3 + '-wal', { idempotent: true });
            const shmExists = await FileSystemLegacy.getInfoAsync(dbPathV3 + '-shm');
            if (shmExists.exists) await FileSystemLegacy.deleteAsync(dbPathV3 + '-shm', { idempotent: true });
          } catch {}
          console.log('Creating fresh v4 database');
          await initDatabase(true);
        } else {
          // No database - create fresh
          console.log('Creating fresh v4 database');
          await initDatabase(true);
        }
        console.log('Database setup complete');
        setIsReady(true);
      } catch (err) {
        console.error('Database setup failed:', err);
        // Fallback: delete everything and start fresh
        try {
          console.log('Attempting recovery: deleting corrupt database...');
          const dbDir = FileSystemLegacy.documentDirectory + 'SQLite/';
          try {
            await FileSystemLegacy.deleteAsync(dbDir, { idempotent: true });
          } catch {}
          await initDatabase(true);
          console.log('Recovery complete');
          setIsReady(true);
        } catch (fallbackErr) {
          setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to initialize database');
        }
      }
    }
    setup();
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
