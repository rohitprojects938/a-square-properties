const db = require('../config/db');

async function clean() {
  await db.initPool();
  try {
    const [users] = await db.query('SELECT id, name, email, role, created_at FROM users');
    console.log('Current users:');
    console.log(users);

    const testUsers = users.filter(u => u.email.endsWith('@houserenter.in') && u.email !== 'manoj@houserenter.in');
    
    console.log(`Found ${testUsers.length} test users to delete.`);
    if (testUsers.length > 0) {
      const testUserIds = testUsers.map(u => u.id);
      
      // Delete properties owned by these test users
      const [props] = await db.query('SELECT id FROM properties WHERE user_id IN (?)', [testUserIds]);
      const propIds = props.map(p => p.id);
      console.log(`Found ${propIds.length} properties belonging to test users.`);
      
      if (propIds.length > 0) {
        await db.query('DELETE FROM property_images WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM property_videos WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM saved_properties WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM property_views WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM reviews WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM enquiries WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM visits WHERE property_id IN (?)', [propIds]);
        await db.query('DELETE FROM properties WHERE id IN (?)', [propIds]);
        console.log('Deleted properties and associated files.');
      }
      
      // Delete the users
      await db.query('DELETE FROM users WHERE id IN (?)', [testUserIds]);
      console.log('Deleted test users successfully.');
    }
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    process.exit(0);
  }
}

clean();
