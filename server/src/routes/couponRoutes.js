const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/couponController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validateCoupon } = require('../validations/couponValidation');

// Public routes (for checkout)
router.post('/validate', authenticateToken, CouponController.validateCoupon);

// Organizer routes
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['organizer']),
  validateCoupon,
  CouponController.createCoupon
);

router.get(
  '/event/:eventId',
  authenticateToken,
  authorizeRoles(['organizer', 'admin', 'sub_admin']),
  CouponController.getEventCoupons
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['organizer', 'admin', 'sub_admin']),
  validateCoupon,
  CouponController.updateCoupon
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['organizer', 'admin', 'sub_admin']),
  CouponController.deleteCoupon
);

router.get(
  '/:id/stats',
  authenticateToken,
  authorizeRoles(['organizer', 'admin', 'sub_admin']),
  CouponController.getCouponStats
);

module.exports = router;