const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. Get approved customer reviews
router.get('/reviews', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM customer_reviews WHERE status = 'approved' ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Submit a new customer review (defaults to pending)
router.post('/reviews', async (req, res) => {
  const { name, rating, review_text } = req.body;
  if (!name || !rating || !review_text) {
    return res.status(400).json({ success: false, error: 'Name, rating, and review text are required.' });
  }
  const ratingInt = parseInt(rating);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
  }
  try {
    await db.query(
      'INSERT INTO customer_reviews (name, rating, review_text, status) VALUES (?, ?, ?, "pending")',
      [name, ratingInt, review_text]
    );
    res.json({ success: true, message: 'Review submitted successfully and is pending approval.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Submit a new loan lead application
router.post('/loan/apply', async (req, res) => {
  const { aadhaar_number, pan_number, mobile_number } = req.body;
  if (!aadhaar_number || !pan_number || !mobile_number) {
    return res.status(400).json({ success: false, error: 'Aadhaar, PAN, and Mobile number are required.' });
  }
  // Validate Aadhaar (12 digits)
  if (!/^\d{12}$/.test(aadhaar_number)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 12-digit Aadhaar number.' });
  }
  // Validate PAN (10 chars, standard regex)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number.toUpperCase())) {
    return res.status(400).json({ success: false, error: 'Please enter a valid PAN number (e.g. ABCDE1234F).' });
  }
  // Validate Indian mobile (10 digits)
  if (!/^[6-9]\d{9}$/.test(mobile_number)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
  }

  try {
    await db.query(
      'INSERT INTO loan_leads (aadhaar_number, pan_number, mobile_number) VALUES (?, ?, ?)',
      [aadhaar_number, pan_number.toUpperCase(), mobile_number]
    );
    res.json({ success: true, message: 'Loan application submitted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
