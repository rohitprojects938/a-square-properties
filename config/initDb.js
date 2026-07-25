const fs = require('fs');
const path = require('path');
const db = require('./db');
const { seedDatabaseData } = require('./seeder');

async function addColumnIfNotExist(tableName, columnName, alterQuery) {
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );
    if (rows && rows.length === 0) {
      await db.query(alterQuery);
      console.log(`✅ MySQL Migration: Added column '${columnName}' to '${tableName}' table.`);
    }
  } catch (error) {
    console.error(`❌ Migration check failed for '${tableName}.${columnName}':`, error.message);
  }
}

async function initializeDatabase() {
  await db.initPool();

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
    let queryIndex = 1;
    for (let q of queries) {
      const queryClean = q.replace(/--.*$/gm, '').trim();
      if (queryClean) {
        console.log(`\nExecuting Query ${queryIndex}/${queries.length}`);
        console.log('-------------------------------------------');
        console.log(queryClean);
        console.log('-------------------------------------------');
        await db.query(queryClean);
      }
      queryIndex++;
    }
    console.log('✅ MySQL Database Schema initialized successfully!');

    // Incremental Migrations
    await addColumnIfNotExist('otps', 'attempts', "ALTER TABLE otps ADD COLUMN attempts INT DEFAULT 0;");
    await addColumnIfNotExist('users', 'profile_photo', "ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255) DEFAULT NULL;");
    await addColumnIfNotExist('users', 'provider', "ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'email';");
    await addColumnIfNotExist('properties', 'is_hidden', "ALTER TABLE properties ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;");
    await addColumnIfNotExist('properties', 'is_featured', "ALTER TABLE properties ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;");
    await addColumnIfNotExist('property_images', 'sort_order', "ALTER TABLE property_images ADD COLUMN sort_order INT DEFAULT 0;");

    await seedDatabaseData();

    // Ensure the specific Delhi farmhouse listing is deleted from the database
    try {
      await db.query("DELETE FROM properties WHERE title = '4 BHK Luxury farmhouse in Delhi';");
      console.log('✅ MySQL Cleanup: Removed 4 BHK Luxury farmhouse in Delhi listing.');
    } catch (e) {
      console.warn('⚠️ Cleanup warning:', e.message);
    }

    // Ensure only real user reels are in the DB: delete mock/sample reels
    try {
      await db.query("DELETE FROM reels WHERE video_url IN ('https://www.w3schools.com/html/mov_bbb.mp4', 'https://www.w3schools.com/html/movie.mp4');");
      console.log('✅ MySQL Cleanup: Removed sample video reels.');
    } catch (e) {
      console.warn('⚠️ Reels cleanup warning:', e.message);
    }
  } catch (error) {
    console.error('❌ Failed to run database migrations: ', error.message);
  }
}

module.exports = initializeDatabase;
