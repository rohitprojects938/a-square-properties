const db = require('../config/db');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Standard initialization of Razorpay only if variables exist
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (err) {
    console.warn('⚠️ Razorpay initialization failed. Falling back to Mock Payments.');
  }
}

// 1. Create a payment order (amount = 1 INR)
async function createOrder(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  try {
    const amount = 1.00; // 1 INR
    const amountInPaise = 100; // Razorpay operates in paise
    const receiptId = `receipt_u_${req.user.id}_${Date.now()}`;

    // If Razorpay API is ready, call real SDK
    if (razorpayInstance) {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId
      });

      // Log in DB
      await db.query(
        'INSERT INTO payments (user_id, razorpay_order_id, amount, status) VALUES (?, ?, ?, ?)',
        [req.user.id, order.id, amount, 'pending']
      );

      return res.status(201).json({
        success: true,
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        isMock: false
      });
    }

    // Fallback to Mock Payment Order creation
    const mockOrderId = `order_mock_${Math.random().toString(36).substr(2, 9)}`;
    await db.query(
      'INSERT INTO payments (user_id, razorpay_order_id, amount, status) VALUES (?, ?, ?, ?)',
      [req.user.id, mockOrderId, amount, 'pending']
    );

    res.status(201).json({
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: 'rzp_test_mockKey123',
      isMock: true
    });
  } catch (error) {
    console.error('Create order error: ', error.message);
    res.status(500).json({ success: false, error: 'Server payment order failure.' });
  }
}

// 2. Verify payment signature
async function verifyPayment(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = req.body;

  try {
    let isValid = false;

    if (isMock || !razorpayInstance) {
      // Mock validation succeeds automatically
      isValid = true;
    } else {
      // Real HMAC verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      isValid = expectedSignature === razorpay_signature;
    }

    if (!isValid) {
      await db.query('UPDATE payments SET status = ? WHERE razorpay_order_id = ?', ['failed', razorpay_order_id]);
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    // Payment is valid! Update status
    const paymentIdVal = razorpay_payment_id || `pay_mock_${Math.random().toString(36).substr(2, 9)}`;
    await db.query(
      'UPDATE payments SET status = ?, razorpay_payment_id = ? WHERE razorpay_order_id = ?',
      ['success', paymentIdVal, razorpay_order_id]
    );

    // Set subscription dates (Active for 1 Year)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    await db.query(
      'INSERT INTO subscriptions (user_id, plan_name, price, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, '₹1 Premium Posting Plan', 1.00, expirationDate, true]
    );

    // Update user record status
    await db.query(
      'UPDATE users SET subscription_status = ?, subscription_expires_at = ? WHERE id = ?',
      ['active', expirationDate, req.user.id]
    );

    // Insert user notification
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [req.user.id, 'Subscription Activated', 'Your ₹1 Premium Property Posting Subscription is now active! Expires on ' + expirationDate.toLocaleDateString()]
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified and Subscription activated successfully!',
      expiresAt: expirationDate
    });
  } catch (error) {
    console.error('Verify payment error: ', error.message);
    res.status(500).json({ success: false, error: 'Server verification callback failure.' });
  }
}

// 3. Get Invoice/Payment History
async function getHistory(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  try {
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );
    const [subscriptions] = await db.query(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      payments,
      subscriptions
    });
  } catch (error) {
    console.error('Get history error: ', error.message);
    res.status(500).json({ success: false, error: 'Server payment history retrieve error.' });
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  getHistory
};
