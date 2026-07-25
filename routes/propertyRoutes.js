const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authenticateJWT, requireAuth } = require('../middlewares/authMiddleware');
const { propertyRules, checkValidation } = require('../middlewares/validationMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Property routes
router.post('/', authenticateJWT, requireAuth, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }]), propertyController.createProperty);
router.put('/:id', authenticateJWT, requireAuth, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }]), propertyController.updateProperty);
router.get('/', authenticateJWT, propertyController.getProperties);
router.get('/:id', authenticateJWT, propertyController.getPropertyById);
router.delete('/:id', authenticateJWT, requireAuth, propertyController.deleteProperty);
router.post('/:id/save', authenticateJWT, requireAuth, propertyController.toggleSaveProperty);

// Visit, Inquiry and review routes
router.post('/action/visit', authenticateJWT, requireAuth, propertyController.scheduleVisit);
router.post('/action/enquiry', authenticateJWT, propertyController.submitEnquiry);
router.post('/action/review', authenticateJWT, requireAuth, propertyController.addReview);

// Reels Feed routes
router.get('/feed/reels', authenticateJWT, propertyController.getReels);
router.post('/feed/reels', authenticateJWT, requireAuth, upload.fields([{ name: 'video', maxCount: 1 }]), propertyController.uploadReel);
router.post('/feed/reels/:id/like', authenticateJWT, requireAuth, propertyController.toggleReelLike);
router.post('/feed/reels/:id/comment', authenticateJWT, requireAuth, propertyController.addReelComment);

module.exports = router;
