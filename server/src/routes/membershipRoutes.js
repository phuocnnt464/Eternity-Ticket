const express = require('express');
const router = express.Router();
const MembershipController = require('../controllers/membershipController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validateMembershipOrder } = require('../middleware/validationMiddleware');

router.get('/pricing', MembershipController.getPricing);

router.get('/current', authenticateToken, MembershipController.getCurrentMembership);

router.post(
  '/orders',
  authenticateToken,
  validateMembershipOrder,
  MembershipController.createOrder
);

router.get(
  '/orders/:orderNumber',
  authenticateToken,
  MembershipController.getOrderDetails
);

router.get('/history', authenticateToken, MembershipController.getHistory);

router.post('/cancel', authenticateToken, MembershipController.cancelMembership);

router.get(
  '/admin/all',
  authenticateToken,
  authorizeRoles('admin', 'sub_admin'),
  MembershipController.adminGetAllMemberships
);

router.put(
  '/admin/pricing/:tier',
  authenticateToken,
  authorizeRoles('admin'),
  MembershipController.adminUpdatePricing
);

router.post('/orders/:orderNumber/payment',
  authenticateToken,
  MembershipController.processPayment
);

router.post('/orders/:orderNumber/payment/mock',
  authenticateToken,
  MembershipController.mockPayment
);

module.exports = router;