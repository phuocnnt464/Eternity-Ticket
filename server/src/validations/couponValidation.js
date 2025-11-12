const { body, param } = require('express-validator');
// Validation rules for coupon creation and validation should be changed to Joi

const validateCoupon = [
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required')
    .isLength({ min: 3, max: 50 }).withMessage('Code must be 3-50 characters')
    .matches(/^[A-Z0-9_-]+$/).withMessage('Code must contain only uppercase letters, numbers, underscores, and hyphens'),
  
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title too long'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long'),
  
  body('event_id')
    .optional()
    .isUUID().withMessage('Invalid event ID'),
  
  body('type')
    .notEmpty().withMessage('Discount type is required')
    .isIn(['percentage', 'fixed_amount']).withMessage('Invalid discount type'),
  
  body('discount_value')
    .notEmpty().withMessage('Discount value is required')
    .isFloat({ min: 0 }).withMessage('Discount value must be positive'),
  
  body('max_discount_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Max discount must be positive'),
  
  body('min_order_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Min order amount must be positive'),
  
  body('usage_limit')
    .optional()
    .isInt({ min: 1 }).withMessage('Usage limit must be at least 1'),
  
  body('usage_limit_per_user')
    .optional()
    .isInt({ min: 1 }).withMessage('Per-user limit must be at least 1'),
  
  body('valid_from')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date'),
  
  body('valid_until')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.valid_from)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('membership_tiers')
    .optional()
    .isArray().withMessage('Membership tiers must be an array')
];

const validateCouponCode = [
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required'),
  
  body('eventId')
    .optional()
    .isUUID().withMessage('Invalid event ID'),
  
  body('orderAmount')
    .notEmpty().withMessage('Order amount is required')
    .isFloat({ min: 0 }).withMessage('Order amount must be positive')
];

module.exports = {
  validateCoupon,
  validateCouponCode
};