const db = require('../config/db');

// Retrieve all active service categories
async function getServices(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM home_services WHERE is_active = 1 ORDER BY sort_order ASC');
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get services error: ', error.message);
    // Fallback Mock services in case of database errors
    const fallbackServices = [
      { id: 1, name: 'Electrician Service', icon: '⚡', description: 'Electrical installations and repair service.', whatsapp_number: '+919919014220' },
      { id: 2, name: 'Building Material Service', icon: '🏗️', description: 'Bricks, cement, and other building supplies.', whatsapp_number: '+919919014220' }
    ];
    res.status(200).json({ success: true, data: fallbackServices });
  }
}

module.exports = {
  getServices
};
