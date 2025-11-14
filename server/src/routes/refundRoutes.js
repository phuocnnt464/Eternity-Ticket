const express = require('express');
const router = express.Router();
const RefundController = require('../controllers/refundController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validate, validateUUIDParam } = require('../middleware/validationMiddleware');
const { logAdminAudit } = require('../middleware/activityLogger');

// Import Joi schemas
const {
  createRefundRequestSchema,
  approveRefundSchema,
  rejectRefundSchema,
  processRefundSchema,
  getRefundsQuerySchema
} = require('../validations/refundValidation');

// =============================================
// PARTICIPANT ROUTES
// =============================================

/**
 * @route   POST /api/refunds
 * @desc    Create refund request
 * @access  Private (Participant)
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('participant'),
  validate(createRefundRequestSchema),
  RefundController.createRefundRequest
);

/**
 * @route   GET /api/refunds/my-requests
 * @desc    Get current user's refund requests
 * @access  Private
 */
router.get(
  '/my-requests',
  authenticateToken,
  validate(getRefundsQuerySchema, 'query'),
  RefundController.getMyRefundRequests
);

// =============================================
// ADMIN ROUTES
// =============================================

/**
 * @route   GET /api/refunds
 * @desc    Get all refund requests (Admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validate(getRefundsQuerySchema, 'query'),
  RefundController.getRefundRequests
);

/**
 * @route   GET /api/refunds/:id
 * @desc    Get refund request by ID
 * @access  Private (Admin or Owner)
 */
router.get(
  '/:id',
  authenticateToken,
  validateUUIDParam('id'),
  RefundController.getRefundById
);

/**
 * @route   PUT /api/refunds/:id/approve
 * @desc    Approve refund request
 * @access  Private (Admin)
 */
router.put(
  '/:id/approve',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  validate(approveRefundSchema),
   logAdminAudit('APPROVE_REFUND', 'REFUND'), 
  RefundController.approveRefund
);

/**
 * @route   PUT /api/refunds/:id/reject
 * @desc    Reject refund request
 * @access  Private (Admin)
 */
router.put(
  '/:id/reject',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  validate(rejectRefundSchema),
  logAdminAudit('REJECT_REFUND', 'REFUND'),
  RefundController.rejectRefund
);

/**
 * @route   PUT /api/refunds/:id/process
 * @desc    Process refund (complete payment)
 * @access  Private (Admin)
 */
router.put(
  '/:id/process',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  validate(processRefundSchema),
  logAdminAudit('PROCESS_REFUND', 'REFUND'),
  RefundController.processRefund
);

module.exports = router;