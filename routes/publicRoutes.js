const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { upload, processProfileImage } = require('../middlewares/uploadMiddleware');

// 1. Get approved customer reviews
router.get('/reviews', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM customer_reviews WHERE status = 'approved' ORDER BY rating DESC, id DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Submit a new customer review (defaults to approved instantly)
router.post('/reviews', upload.single('profile_photo'), async (req, res) => {
  const { name, city, rating, review_text } = req.body;
  if (!name || !rating || !review_text) {
    return res.status(400).json({ success: false, error: 'Name, rating, and review text are required.' });
  }

  // Prevent duplicate rapid submissions (rate limit 10 seconds per submission)
  const now = Date.now();
  if (req.session && req.session.lastReviewSubmitTime && (now - req.session.lastReviewSubmitTime < 10000)) {
    return res.status(429).json({ success: false, error: 'Please wait at least 10 seconds between submissions.' });
  }
  if (req.session) {
    req.session.lastReviewSubmitTime = now;
  }

  const ratingInt = parseInt(rating);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
  }

  // Sanitize text inputs for basic XSS prevention
  const sanitizeHtml = (str) => {
    return str.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  const sanitizedName = sanitizeHtml(name);
  const sanitizedCity = city ? sanitizeHtml(city) : null;
  const sanitizedReviewText = sanitizeHtml(review_text);

  // Extract user details if logged in
  const userId = (req.session && req.session.userId) ? req.session.userId : null;
  const userEmail = (req.session && req.session.user && req.session.user.email) ? req.session.user.email : null;

  let profilePhotoUrl = null;
  try {
    if (req.file) {
      profilePhotoUrl = await processProfileImage(req.file.buffer);
    }
  } catch (sharpErr) {
    console.warn('⚠️ Profile image processing failed:', sharpErr.message);
  }

  try {
    const result = await db.query(
      'INSERT INTO customer_reviews (name, city, rating, review_text, status, profile_photo, user_id, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sanitizedName, sanitizedCity, ratingInt, sanitizedReviewText, "approved", profilePhotoUrl, userId, userEmail]
    );
    
    const insertId = result && result[0] ? result[0].insertId : (result ? result.insertId : null);

    const newReview = {
      id: insertId,
      name: sanitizedName,
      city: sanitizedCity,
      rating: ratingInt,
      review_text: sanitizedReviewText,
      status: 'approved',
      profile_photo: profilePhotoUrl,
      created_at: new Date()
    };

    res.json({ success: true, message: 'Review published successfully!', data: newReview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rate-limit store for loan applications (in-memory, keyed by mobile number)
const loanRateLimitMap = new Map();

// 3. Submit a new loan lead application
router.post('/loan/apply', async (req, res) => {
  const sanitize = (str) => (str || '').toString().trim()
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const aadhaar_number = sanitize(req.body.aadhaar_number);
  const pan_number     = sanitize(req.body.pan_number).toUpperCase();
  const mobile_number  = sanitize(req.body.mobile_number);

  // Required field checks
  if (!aadhaar_number || !pan_number || !mobile_number) {
    return res.status(400).json({ success: false, error: 'Aadhaar, PAN, and Mobile number are required.' });
  }
  // Validate Aadhaar (exactly 12 digits, numbers only)
  if (!/^\d{12}$/.test(aadhaar_number)) {
    return res.status(400).json({ success: false, error: 'Aadhaar must be exactly 12 digits.' });
  }
  // Validate PAN (standard Indian PAN format)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) {
    return res.status(400).json({ success: false, error: 'Enter a valid PAN number (e.g. ABCDE1234F).' });
  }
  // Validate Indian mobile number
  if (!/^[6-9]\d{9}$/.test(mobile_number)) {
    return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number.' });
  }

  // Rate-limit: one submission per mobile number per 60 seconds
  const now = Date.now();
  const lastTime = loanRateLimitMap.get(mobile_number) || 0;
  if (now - lastTime < 60000) {
    return res.status(429).json({ success: false, error: 'Please wait 60 seconds before resubmitting.' });
  }
  loanRateLimitMap.set(mobile_number, now);
  // Auto-clean old entries to prevent memory bloat
  if (loanRateLimitMap.size > 5000) {
    for (const [k, v] of loanRateLimitMap) { if (now - v > 120000) loanRateLimitMap.delete(k); }
  }

  // Extract logged-in user info from session (if authenticated)
  const userId        = (req.session && req.session.userId) ? req.session.userId : null;
  const applicantName = (req.session && req.session.user && req.session.user.name) ? req.session.user.name : null;
  const email         = (req.session && req.session.user && req.session.user.email) ? req.session.user.email : null;

  try {
    const [result] = await db.query(
      'INSERT INTO loan_leads (aadhaar_number, pan_number, mobile_number, user_id, applicant_name, email, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [aadhaar_number, pan_number, mobile_number, userId, applicantName, email, 'pending']
    );
    res.json({ success: true, message: 'Loan application submitted successfully. Our team will contact you shortly.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Submission failed. Please try again.' });
  }
});

// 4. Retrieve public site & loan settings
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT loan_section_enabled, loan_apply_button_text FROM site_settings LIMIT 1');
    const settings = rows[0] || { loan_section_enabled: 1, loan_apply_button_text: 'Apply Now' };
    res.json({ success: true, data: settings });
  } catch (err) {
    res.json({ success: true, data: { loan_section_enabled: 1, loan_apply_button_text: 'Apply Now' } });
  }
});

module.exports = router;
