const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateJWT, requireAuth } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.get('/', serviceController.getServices);
router.post('/', authenticateJWT, requireAuth, upload.array('images', 5), serviceController.postService);
router.get('/:id', serviceController.getServiceById);
router.put('/:id', authenticateJWT, requireAuth, upload.array('images', 5), serviceController.updateService);
router.delete('/:id', authenticateJWT, requireAuth, serviceController.deleteService);

// Rating and Reviews endpoints
router.post('/:id/ratings', authenticateJWT, requireAuth, serviceController.rateService);
router.get('/:id/reviews', serviceController.getServiceReviews);

module.exports = router;
