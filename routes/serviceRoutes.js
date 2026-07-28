const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

router.get('/', serviceController.getServices);
router.post('/', authenticateJWT, serviceController.postService);

module.exports = router;
