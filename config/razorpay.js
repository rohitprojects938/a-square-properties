const Razorpay = require('razorpay');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpay = null;

if (keyId && keySecret) {
  try {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    console.log('💳 Razorpay SDK initialized successfully in production/sandbox mode.');
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay: ', error.message);
  }
} else {
  console.warn('⚠️ Razorpay Key ID or Secret is missing. Payments will run in mock fallback mode.');
}

module.exports = razorpay;
