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

router.post('/validate', 
  authenticateToken,
  validate(validateCouponSchema),
  CouponController.validateCoupon
);

router.post('/',
  authenticateToken,
  authorizeRoles('organizer'),
  validate(createCouponSchema),
  CouponController.createCoupon
);

router.get('/event/:eventId',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validateUUIDParam('eventId'),
  CouponController.getEventCoupons
);

router.put('/:id',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validate(couponParamSchema, 'params'),
  validate(createCouponSchema),
  CouponController.updateCoupon
);

router.delete('/:id',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validate(couponParamSchema, 'params'),
  CouponController.deleteCoupon
);

router.get('/:id/stats',
  authenticateToken,
  authorizeRoles('organizer', 'admin', 'sub_admin'),
  validate(couponParamSchema, 'params'),
  CouponController.getCouponStats
);

module.exports = router;