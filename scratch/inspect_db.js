const db = require('../config/db');

async function main() {
  try {
    const [images] = await db.query('SELECT * FROM property_images LIMIT 20');
    console.log('--- PROPERTY IMAGES ---');
    console.log(images);
    const [properties] = await db.query('SELECT id, title FROM properties LIMIT 5');
    console.log('--- PROPERTIES ---');
    console.log(properties);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
