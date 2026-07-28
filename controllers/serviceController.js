const db = require('../config/db');

// In-memory rate limiting map for spam prevention (60 seconds per IP / mobile number)
const serviceSubmissionRateLimit = new Map();

// Retrieve all approved services with computed ratings and category/search filters
async function getServices(req, res) {
  const { category, search } = req.query;
  
  let query = `
    SELECT hs.*,
           COALESCE((SELECT AVG(rating) FROM service_ratings WHERE service_id = hs.id), 0) as avg_rating,
           (SELECT COUNT(*) FROM service_ratings WHERE service_id = hs.id) as total_ratings,
           (SELECT COUNT(*) FROM service_ratings WHERE service_id = hs.id AND review IS NOT NULL AND TRIM(review) != '') as total_reviews
    FROM home_services hs
    WHERE hs.status = 'approved'
  `;
  const params = [];

  if (category && category !== 'all') {
    query += ' AND hs.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (hs.name LIKE ? OR hs.category LIKE ? OR hs.city LIKE ? OR hs.provider_name LIKE ?)';
    const searchWild = `%${search}%`;
    params.push(searchWild, searchWild, searchWild, searchWild);
  }

  // Sort: 1. Highest Average Rating, 2. Highest Ratings Count, 3. Recency
  query += ' ORDER BY avg_rating DESC, total_ratings DESC, hs.sort_order ASC, hs.id DESC';

  try {
    const [rows] = await db.query(query, params);
    
    // Ensure numeric fields are formatted correctly for client consumption
    const formatted = rows.map(r => ({
      ...r,
      avg_rating: parseFloat(r.avg_rating || 0),
      total_ratings: parseInt(r.total_ratings || 0),
      total_reviews: parseInt(r.total_reviews || 0)
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get services error: ', error.message);
    res.status(500).json({ success: false, error: 'Database fetch error.' });
  }
}

// User submission of service (direct approval workflow)
async function postService(req, res) {
  const { 
    name, 
    category,
    description,
    mobile_number,
    whatsapp_number,
    city,
    address,
    experience,
    starting_price,
    image_url,
    available_days,
    working_hours,
    website,
    facebook,
    instagram
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
  const cleanWorkingHours = clean(working_hours);
  const cleanWebsite = clean(website);
  const cleanFacebook = clean(facebook);
  const cleanInstagram = clean(instagram);
  const price = starting_price ? parseFloat(starting_price) : null;

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

  // 4. Handle multiple files processing using Multer & Sharp
  let imageUrlsArray = [];
  if (req.files && req.files.length > 0) {
    const { processImage } = require('../middlewares/uploadMiddleware');
    for (const file of req.files) {
      try {
        const path = await processImage(file.buffer, 'services', 'svc');
        imageUrlsArray.push(path);
      } catch (err) {
        console.error('Image processing failed:', err.message);
      }
    }
  }

  // Fallback if no files uploaded but user provided a single fallback image URL or we use a default
  let primaryImageUrl = imageUrlsArray.length > 0 ? imageUrlsArray[0] : null;
  if (!primaryImageUrl && image_url) {
    primaryImageUrl = image_url.trim();
    imageUrlsArray.push(primaryImageUrl);
  }
  const image_urls_str = imageUrlsArray.length > 0 ? JSON.stringify(imageUrlsArray) : null;

  try {
    // Insert with status = 'approved' immediately so it is visible publicly without admin approval
    const [result] = await db.query(
      `INSERT INTO home_services 
      (user_id, provider_name, name, category, description, mobile_number, whatsapp_number, city, address, experience, starting_price, image_url, image_urls, available_days, working_hours, website, facebook, instagram, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [userId, providerName, cleanName, cleanCategory, cleanDescription, cleanMobile, cleanWhatsapp, cleanCity, cleanAddress, cleanExperience, price, primaryImageUrl, image_urls_str, cleanDays, cleanWorkingHours, cleanWebsite, cleanFacebook, cleanInstagram]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Service published successfully! It is now visible to the public.', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Submit service error: ', error.message);
    res.status(500).json({ success: false, error: 'Database insert failure.' });
  }
}

// Rate and review a service (upsert)
async function rateService(req, res) {
  const serviceId = parseInt(req.params.id);
  const { rating, review } = req.body;
  const userId = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
  }

  const cleanReview = review ? String(review).replace(/[<>]/g, '').trim() : null;

  try {
    const [[service]] = await db.query('SELECT id FROM home_services WHERE id = ?', [serviceId]);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    await db.query(
      `INSERT INTO service_ratings (user_id, service_id, rating, review)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review), updated_at = CURRENT_TIMESTAMP`,
      [userId, serviceId, parseInt(rating), cleanReview]
    );

    res.status(200).json({ success: true, message: 'Rating and review saved successfully!' });
  } catch (error) {
    console.error('Rate service error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save rating.' });
  }
}

// Get reviews list for a service
async function getServiceReviews(req, res) {
  const serviceId = parseInt(req.params.id);

  try {
    const [rows] = await db.query(
      `SELECT sr.id, sr.user_id, sr.rating, sr.review, sr.created_at, u.name as user_name
       FROM service_ratings sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.service_id = ?
       ORDER BY sr.created_at DESC`,
      [serviceId]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get reviews error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
  }
}

module.exports = {
  getServices,
  postService,
  rateService,
  getServiceReviews
};
