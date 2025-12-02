const express = require('express');
const router = express.Router();
const RefundController = require('../controllers/refundController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validate, validateUUIDParam } = require('../middleware/validationMiddleware');
const { logAdminAudit } = require('../middleware/activityLogger');

const {
  createRefundRequestSchema,
  approveRefundSchema,
  rejectRefundSchema,
  processRefundSchema,
  getRefundsQuerySchema
} = require('../validations/refundValidation');

router.post(
  '/',
  authenticateToken,
  authorizeRoles('participant'),
  validate(createRefundRequestSchema),
  RefundController.createRefundRequest
);

router.get(
  '/my-requests',
  authenticateToken,
  validate(getRefundsQuerySchema, 'query'),
  RefundController.getMyRefundRequests
);

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validate(getRefundsQuerySchema, 'query'),
  RefundController.getRefundRequests
);

router.get(
  '/:id',
  authenticateToken,
  validateUUIDParam('id'),
  RefundController.getRefundById
);

router.put(
  '/:id/approve',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  validate(approveRefundSchema),
   logAdminAudit('APPROVE_REFUND', 'REFUND'), 
  RefundController.approveRefund
);

router.put(
  '/:id/reject',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  validateUUIDParam('id'),
  validate(rejectRefundSchema),
  logAdminAudit('REJECT_REFUND', 'REFUND'),
  RefundController.rejectRefund
);

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