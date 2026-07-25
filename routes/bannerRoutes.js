const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authenticateJWT, requireAuth, isAdmin } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Public route to fetch banners
router.get('/', bannerController.getBanners);

// Protected routes (Admin only)
router.get('/admin', authenticateJWT, requireAuth, isAdmin, bannerController.getAllBannersForAdmin);
router.post('/', authenticateJWT, requireAuth, isAdmin, upload.single('image'), bannerController.createBanner);
router.put('/:id', authenticateJWT, requireAuth, isAdmin, upload.single('image'), bannerController.updateBanner);
router.delete('/:id', authenticateJWT, requireAuth, isAdmin, bannerController.deleteBanner);

module.exports = router;
