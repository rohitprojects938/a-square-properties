const fs = require('fs');
const path = require('path');
const db = require('./db');
const { seedDatabaseData } = require('./seeder');

async function initializeDatabase() {
  if (db.isMock()) {
    console.log('⚡ Mock Database initialized. Skipping physical schema migrations.');
    await seedDatabaseData();
    return;
  }

  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️ schema.sql not found. Skipping SQL schema setup.');
      await seedDatabaseData();
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    // Split SQL by semicolon, but ignore semicolon inside quotes or comments
    const queries = schemaSql
      .split(/;\s*$/m)
      .map(q => q.trim())
      .filter(q => q.length > 0);

    console.log(`⏳ Running ${queries.length} queries to initialize database schema...`);
    for (let q of queries) {
      const queryClean = q.replace(/--.*$/gm, '').trim();
      if (queryClean) {
        await db.query(queryClean);
      }
    }
    console.log('✅ MySQL Database Schema initialized successfully!');

    // Incremental Migrations
    try {
      await db.query("ALTER TABLE otps ADD COLUMN attempts INT DEFAULT 0;");
      console.log('✅ MySQL Migration: Added attempts column to otps table.');
    } catch (e) {
      // Ignored if column already exists
    }

    try {
      await db.query("ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;");
      console.log('✅ MySQL Migration: Added profile_photo column to users table.');
    } catch (e) {
      // Ignored if column already exists
    }

    try {
      await db.query("ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'email';");
      console.log('✅ MySQL Migration: Added provider column to users table.');
    } catch (e) {
      // Ignored if column already exists
    }

    await seedDatabaseData();
  } catch (error) {
    console.error('❌ Failed to run database migrations: ', error.message);
  }
}

module.exports = initializeDatabase;
