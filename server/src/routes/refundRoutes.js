const express = require('express');
const router = express.Router();
const RefundController = require('../controllers/refundController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validateRefundRequest } = require('../validations/refundValidation');

// Participant routes
router.post(
  '/',
  authenticateToken,
  validateRefundRequest,
  RefundController.createRefundRequest
);

router.get(
  '/my-requests',
  authenticateToken,
  RefundController.getMyRefundRequests
);

// Admin routes
router.get(
  '/',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  RefundController.getRefundRequests
);

router.get(
  '/:id',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  RefundController.getRefundById
);

router.put(
  '/:id/approve',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  RefundController.approveRefund
);

router.put(
  '/:id/reject',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  RefundController.rejectRefund
);

router.put(
  '/:id/process',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  RefundController.processRefund
);

module.exports = router;