const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { authenticateJWT, requireAuth } = require('../middlewares/authMiddleware');
const { registerRules, loginRules, checkValidation } = require('../middlewares/validationMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Public routes
router.get('/config', authController.getAuthConfig);
router.post('/register', registerRules, checkValidation, authController.register);
router.post('/login', loginRules, checkValidation, authController.login);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/google-login', authController.googleLogin);
router.post('/logout', authController.logout);

// Protected routes (JWT authentication applied)
router.get('/profile', authenticateJWT, requireAuth, authController.getProfile);
router.put('/profile', authenticateJWT, requireAuth, upload.fields([{ name: 'profile_picture', maxCount: 1 }]), authController.updateProfile);

module.exports = router;
