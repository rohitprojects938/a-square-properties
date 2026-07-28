const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.get('/', serviceController.getServices);
router.post('/', authenticateJWT, upload.array('images', 5), serviceController.postService);
router.get('/:id', serviceController.getServiceById);
router.put('/:id', authenticateJWT, upload.array('images', 5), serviceController.updateService);
router.delete('/:id', authenticateJWT, serviceController.deleteService);

// Rating and Reviews endpoints
router.post('/:id/ratings', authenticateJWT, serviceController.rateService);
router.get('/:id/reviews', serviceController.getServiceReviews);

module.exports = router;
