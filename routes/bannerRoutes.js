const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authenticateJWT, requireAuth, isAdmin } = require('../middlewares/authMiddleware');

// Public route to fetch banners
router.get('/', bannerController.getBanners);

// Protected routes (Admin only)
router.post('/', authenticateJWT, requireAuth, isAdmin, bannerController.createBanner);
router.put('/:id', authenticateJWT, requireAuth, isAdmin, bannerController.updateBanner);
router.delete('/:id', authenticateJWT, requireAuth, isAdmin, bannerController.deleteBanner);

module.exports = router;
