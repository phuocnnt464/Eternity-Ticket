const { body, param } = require('express-validator');
// Validation rules for refund requests should be change to Joi

const validateRefundRequest = [
  body('orderId')
    .notEmpty().withMessage('Order ID is required')
    .isUUID().withMessage('Invalid order ID'),
  
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isIn(['event_cancelled', 'payment_failed', 'duplicate_payment', 'other'])
    .withMessage('Invalid refund reason'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long')
];

const validateRefundApproval = [
  param('id')
    .isUUID().withMessage('Invalid refund ID'),
  
  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Review notes too long')
];

const validateRefundRejection = [
  param('id')
    .isUUID().withMessage('Invalid refund ID'),
  
  body('rejectionReason')
    .notEmpty().withMessage('Rejection reason is required')
    .trim()
    .isLength({ max: 1000 }).withMessage('Rejection reason too long')
];

const validateRefundProcess = [
  param('id')
    .isUUID().withMessage('Invalid refund ID'),
  
  body('transactionId')
    .notEmpty().withMessage('Transaction ID is required')
    .trim()
];

module.exports = {
  validateRefundRequest,
  validateRefundApproval,
  validateRefundRejection,
  validateRefundProcess
};