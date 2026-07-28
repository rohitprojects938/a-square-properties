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
    await addColumnIfNotExist('homepage_banners', 'sort_order', "ALTER TABLE homepage_banners ADD COLUMN sort_order INT DEFAULT 0;");
    await addColumnIfNotExist('properties', 'status', "ALTER TABLE properties ADD COLUMN status VARCHAR(50) DEFAULT 'active';");

    // Blog table schema alignment — admin controller uses these columns
    await addColumnIfNotExist('blogs', 'excerpt', "ALTER TABLE blogs ADD COLUMN excerpt TEXT DEFAULT NULL;");
    await addColumnIfNotExist('blogs', 'featured_image', "ALTER TABLE blogs ADD COLUMN featured_image VARCHAR(255) DEFAULT NULL;");
    await addColumnIfNotExist('blogs', 'status', "ALTER TABLE blogs ADD COLUMN status VARCHAR(50) DEFAULT 'draft';");
    await addColumnIfNotExist('blogs', 'author', "ALTER TABLE blogs ADD COLUMN author VARCHAR(100) DEFAULT NULL;");

    // Home Services WhatsApp and display order column migrations
    await addColumnIfNotExist('home_services', 'whatsapp_number', "ALTER TABLE home_services ADD COLUMN whatsapp_number VARCHAR(50) DEFAULT '+919919014220';");
    await addColumnIfNotExist('home_services', 'sort_order', "ALTER TABLE home_services ADD COLUMN sort_order INT DEFAULT 0;");
    await addColumnIfNotExist('home_services', 'image_url', "ALTER TABLE home_services ADD COLUMN image_url VARCHAR(255) DEFAULT NULL;");

    // Site settings loan configuration migrations
    await addColumnIfNotExist('site_settings', 'loan_section_enabled', "ALTER TABLE site_settings ADD COLUMN loan_section_enabled TINYINT DEFAULT 1;");
    await addColumnIfNotExist('site_settings', 'loan_apply_button_text', "ALTER TABLE site_settings ADD COLUMN loan_apply_button_text VARCHAR(100) DEFAULT 'Apply Now';");

    // Create Customer Reviews table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS customer_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review_text TEXT NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          reply_text TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ MySQL Migration: Ensure customer_reviews table exists.');
      await addColumnIfNotExist('customer_reviews', 'user_id', "ALTER TABLE customer_reviews ADD COLUMN user_id INT DEFAULT NULL;");
      await addColumnIfNotExist('customer_reviews', 'email', "ALTER TABLE customer_reviews ADD COLUMN email VARCHAR(255) DEFAULT NULL;");
    } catch(err) {
      console.error('❌ Migration failed for customer_reviews:', err.message);
    }

    // Create Loan Leads table
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS loan_leads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          aadhaar_number VARCHAR(20) NOT NULL,
          pan_number VARCHAR(20) NOT NULL,
          mobile_number VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ MySQL Migration: Ensure loan_leads table exists.');
    } catch(err) {
      console.error('❌ Migration failed for loan_leads:', err.message);
    }

    // Pre-populate initial services: Electrician Service & Building Material Service if empty
    try {
      const [existing] = await db.query("SELECT COUNT(*) as c FROM home_services");
      if (existing && existing[0].c === 0) {
        await db.query(`
          INSERT INTO home_services (name, icon, description, whatsapp_number, sort_order) VALUES
          ('Electrician Service', '⚡', 'Instant residential wiring, switchboard installation, and electric repairs.', '+919919014220', 1),
          ('Building Material Service', '🏗️', 'Supply of premium cement, steel, bricks, and sand materials.', '+919919014220', 2)
        `);
        console.log('✅ MySQL Seeder: Injected default home services.');
      }
    } catch(err) {
      console.warn('⚠️ Seeder warning for home_services:', err.message);
    }

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

    // Clean up test users (all users with @houserenter.in email except admin)
    try {
      const [result] = await db.query("DELETE FROM users WHERE email LIKE '%@houserenter.in' AND email != 'manoj@houserenter.in';");
      console.log(`✅ MySQL Cleanup: Deleted test users (${result.affectedRows} rows affected). All associated listings cascaded.`);
    } catch (e) {
      console.warn('⚠️ Test users cleanup warning:', e.message);
    }
  } catch (error) {
    console.error('❌ Failed to run database migrations: ', error.message);
  }
}

module.exports = initializeDatabase;
