/**
 * TEMPORARY script to clear all database tables.
 * Delete this file after running.
 */
const fs = require('fs');
const path = require('path');

async function clearDatabase() {
  try {
    // Find SQLite database in Expo's app data directory
    const baseDir = path.join(
      process.env.LOCALAPPDATA || '',
      'YSC Expo'
    );
    
    const dbFiles = [
      'yasir_v4.db',
      'yasir_v4.db-wal',
      'yasir_v4.db-shm',
      'yasir_v4.db-journal',
      'yasir_v3.db',
      'yasir_v3.db-wal',
      'yasir_v3.db-shm',
      'yasir_v3.db-journal'
    ];

    console.log('🗑️ Searching for database files...');
    console.log('📁 Looking in:', baseDir);
    
    // Check if directory exists
    if (!fs.existsSync(baseDir)) {
      console.log('❌ Expo app directory not found:', baseDir);
      console.log('💡 Make sure the app has been run at least once.');
      return;
    }

    // Search recursively for database files
    let found = false;
    function searchDir(dir) {
      if (!fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            searchDir(fullPath);
          } else if (dbFiles.includes(entry.name)) {
            fs.unlinkSync(fullPath);
            console.log(`🗑️ Deleted: ${fullPath}`);
            found = true;
          }
        }
      } catch (e) {
        // Skip directories we can't access
      }
    }

    searchDir(baseDir);

    if (found) {
      console.log('✅ Database cleared successfully!');
    } else {
      console.log('ℹ️ No database files found. Already clean.');
    }
    console.log('📝 You can now delete this script file (clear-db.js).');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  }
}

clearDatabase();
