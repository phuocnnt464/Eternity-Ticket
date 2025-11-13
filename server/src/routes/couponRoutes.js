// server/src/routes/couponRoutes.js
const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/couponController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validate, validateUUIDParam } = require('../middleware/validationMiddleware');
const {
  createCouponSchema,
  validateCouponSchema,
  couponParamSchema
} = require('../validations/couponValidation');

// =============================================
// PUBLIC ROUTES (for checkout)
// =============================================

/**
 * @route   POST /api/coupons/validate
 * @desc    Validate coupon code during checkout
 * @access  Private (Authenticated users)
 */
router.post('/validate', 
  authenticateToken,
  validate(validateCouponSchema),
  CouponController.validateCoupon
);

// =============================================
// ORGANIZER ROUTES
// =============================================

/**
 * @route   POST /api/coupons
 * @desc    Create new coupon
 * @access  Private (Organizer)
 */
router.post('/',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(createCouponSchema),
  CouponController.createCoupon
);

/**
 * @route   GET /api/coupons/event/:eventId
 * @desc    Get all coupons for an event
 * @access  Private (Organizer/Admin)
 */
router.get('/event/:eventId',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validateUUIDParam('eventId'),
  CouponController.getEventCoupons
);

/**
 * @route   PUT /api/coupons/:id
 * @desc    Update coupon
 * @access  Private (Organizer/Admin)
 */
router.put('/:id',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validate(couponParamSchema, 'params'),
  validate(createCouponSchema),
  CouponController.updateCoupon
);

/**
 * @route   DELETE /api/coupons/:id
 * @desc    Deactivate/delete coupon
 * @access  Private (Organizer/Admin)
 */
router.delete('/:id',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validate(couponParamSchema, 'params'),
  CouponController.deleteCoupon
);

/**
 * @route   GET /api/coupons/:id/stats
 * @desc    Get coupon usage statistics
 * @access  Private (Organizer/Admin)
 */
router.get('/:id/stats',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validate(couponParamSchema, 'params'),
  CouponController.getCouponStats
);

module.exports = router;