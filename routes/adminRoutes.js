const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { authenticateJWT, isAdmin } = require('../middlewares/authMiddleware');
const { adminUpdateUserRules, checkValidation } = require('../middlewares/validationMiddleware');

// ── All admin routes require JWT + admin role + email whitelist ──
router.use(authenticateJWT, isAdmin);

// Dashboard
router.get('/stats', admin.getDashboardStats);

// Users
router.get('/users',           admin.getUsers);
router.get('/users/:id',       admin.getUserById);
router.put('/users/:id',       adminUpdateUserRules, checkValidation, admin.updateUser);
router.delete('/users/:id',    admin.deleteUser);
router.post('/user/role',      admin.updateUserRole);

// Properties
router.get('/properties',              admin.getAdminProperties);
router.delete('/properties/:id',       admin.deleteProperty);
router.post('/property/status',        admin.updatePropertyStatus);
router.post('/property/visibility',    admin.togglePropertyVisibility);
router.post('/property/featured',      admin.toggleFeatured);



// Home Services
router.get('/services',          admin.getServices);
router.post('/services',         admin.createService);
router.put('/services/:id',      admin.updateService);
router.put('/services/:id/status', admin.updateServiceStatus);
router.delete('/services/:id',   admin.deleteService);

// Customer Reviews
router.get('/reviews',           admin.getReviews);
router.put('/reviews/:id/status',admin.updateReviewStatus);
router.post('/reviews/:id/reply',admin.replyToReview);
router.delete('/reviews/:id',    admin.deleteReview);

// Loan Leads
router.get('/loans',                 admin.getLoans);
router.put('/loans/:id/status',      admin.updateLoanStatus);
router.delete('/loans/:id',          admin.deleteLoan);
router.get('/loans/export/xlsx',     admin.exportLoansXlsx);
router.put('/settings/loan',         admin.updateLoanSettings);

// Plans & Subscriptions
router.get('/plans',           admin.getPlans);
router.post('/plans',          admin.createPlan);
router.put('/plans/:id',       admin.updatePlan);
router.delete('/plans/:id',    admin.deletePlan);

// Payments
router.get('/payments',        admin.getPayments);

// Reels
router.get('/reels',           admin.getReels);
router.post('/reel/status',    admin.updateReelStatus);

// Analytics
router.get('/analytics',       admin.getAnalytics);

// Notifications
router.post('/notifications/send', admin.sendNotification);

// Settings
router.get('/settings',        admin.getSettings);
router.put('/settings',        admin.updateSettings);

module.exports = router;
