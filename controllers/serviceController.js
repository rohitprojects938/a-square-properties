const db = require('../config/db');

// In-memory rate limiting map for spam prevention (60 seconds per IP / mobile number)
const serviceSubmissionRateLimit = new Map();

// Retrieve all approved services with category and search filters
async function getServices(req, res) {
  const { category, search } = req.query;
  
  let query = "SELECT * FROM home_services WHERE status = 'approved'";
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR category LIKE ? OR city LIKE ? OR provider_name LIKE ?)';
    const searchWild = `%${search}%`;
    params.push(searchWild, searchWild, searchWild, searchWild);
  }

  query += ' ORDER BY sort_order ASC, id DESC';

  try {
    const [rows] = await db.query(query, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get services error: ', error.message);
    res.status(500).json({ success: false, error: 'Database fetch error.' });
  }
}

// User submission of service
async function postService(req, res) {
  const { 
    name, // Service Title
    category,
    description,
    mobile_number,
    whatsapp_number,
    city,
    address,
    experience,
    starting_price,
    image_url,
    available_days
  } = req.body;

  // 1. Validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Service Title is required.' });
  }
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return res.status(400).json({ success: false, error: 'Service Category is required.' });
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ success: false, error: 'Service Description is required.' });
  }
  if (!mobile_number || !/^[6-9]\d{9}$/.test(mobile_number.trim())) {
    return res.status(400).json({ success: false, error: 'Valid 10-digit Indian Mobile Number is required.' });
  }
  if (!city || typeof city !== 'string' || city.trim() === '') {
    return res.status(400).json({ success: false, error: 'Service Area / City is required.' });
  }

  // Sanitize input texts to prevent XSS
  const clean = (val) => (val ? String(val).replace(/[<>]/g, '').trim() : null);

  const cleanName = clean(name);
  const cleanCategory = clean(category);
  const cleanDescription = clean(description);
  const cleanMobile = clean(mobile_number);
  const cleanWhatsapp = clean(whatsapp_number) || cleanMobile;
  const cleanCity = clean(city);
  const cleanAddress = clean(address);
  const cleanExperience = clean(experience);
  const cleanDays = clean(available_days);
  const price = starting_price ? parseFloat(starting_price) : null;
  const imageUrl = clean(image_url);

  // 2. Spam prevention (rate limit check)
  const clientKey = `${req.ip}_${cleanMobile}`;
  const lastSubmitted = serviceSubmissionRateLimit.get(clientKey);
  const now = Date.now();
  if (lastSubmitted && (now - lastSubmitted < 60000)) {
    return res.status(429).json({ success: false, error: 'Please wait 60 seconds before submitting another service.' });
  }
  serviceSubmissionRateLimit.set(clientKey, now);

  // Auto-clean rate limit map to prevent leaks
  setTimeout(() => serviceSubmissionRateLimit.delete(clientKey), 60000);

  // 3. User details (auto-fill provider name if authenticated)
  const userId = req.user ? req.user.id : null;
  const providerName = req.user ? req.user.name : 'Guest Provider';

  try {
    const [result] = await db.query(
      `INSERT INTO home_services 
      (user_id, provider_name, name, category, description, mobile_number, whatsapp_number, city, address, experience, starting_price, image_url, available_days, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, providerName, cleanName, cleanCategory, cleanDescription, cleanMobile, cleanWhatsapp, cleanCity, cleanAddress, cleanExperience, price, imageUrl, cleanDays]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Service submitted successfully! It is pending approval and will be visible once reviewed.', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Submit service error: ', error.message);
    res.status(500).json({ success: false, error: 'Database insert failure.' });
  }
}

module.exports = {
  getServices,
  postService
};
