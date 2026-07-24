const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT, requireAuth } = require('../middlewares/authMiddleware');

router.post('/order', authenticateJWT, requireAuth, paymentController.createOrder);
router.post('/verify', authenticateJWT, requireAuth, paymentController.verifyPayment);
router.get('/history', authenticateJWT, requireAuth, paymentController.getHistory);

module.exports = router;
