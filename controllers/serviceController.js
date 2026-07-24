const db = require('../config/db');

// Retrieve all service providers in marketplace
async function getServices(req, res) {
  const { category } = req.query;
  try {
    let sql = 'SELECT * FROM services';
    let params = [];

    if (category && category !== 'all') {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY ratings DESC';
    const [rows] = await db.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get services error: ', error.message);
    // Fallback Mock services in case of database errors
    const fallbackServices = [
      { id: 1, name: 'Standard Painter Services', category: 'painter', contact_number: '+919929019201', experience_years: 5, ratings: 4.8, reviews_count: 32, description: 'Premium painter services', image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80' },
      { id: 2, name: 'Quick Electrician Group', category: 'electrician', contact_number: '+919819019202', experience_years: 8, ratings: 4.6, reviews_count: 55, description: 'Standard electrical checks', image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' },
      { id: 3, name: 'Apex Movers & Packers', category: 'packers', contact_number: '+919819019203', experience_years: 6, ratings: 4.5, reviews_count: 24, description: 'Standard packing', image_url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=600&q=80' },
      { id: 4, name: 'Luxe Interior Designers', category: 'interior', contact_number: '+919819019204', experience_years: 12, ratings: 4.9, reviews_count: 41, description: 'Creative spacing designers', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' }
    ];
    const filtered = category && category !== 'all' ? fallbackServices.filter(s => s.category === category) : fallbackServices;
    res.status(200).json({ success: true, data: filtered });
  }
}

module.exports = {
  getServices
};
