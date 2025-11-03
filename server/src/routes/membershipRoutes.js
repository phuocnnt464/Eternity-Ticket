// server/src/routes/membershipRoutes.js
const express = require('express');
const router = express.Router();
const MembershipController = require('../controllers/membershipController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validateMembershipOrder } = require('../middleware/validationMiddleware');

// =============================================
// PUBLIC ROUTES
// =============================================

/**
 * @route   GET /api/membership/pricing
 * @desc    Get membership pricing tiers
 * @access  Public
 */
router.get('/pricing', MembershipController.getPricing);

/**
 * @route   GET /api/membership/payment/vnpay-return
 * @desc    VNPay payment return URL
 * @access  Public
 */
router.get('/payment/vnpay-return', MembershipController.vnpayReturn);

/**
 * @route   GET /api/membership/payment/vnpay-ipn
 * @desc    VNPay IPN callback
 * @access  Public (VNPay server)
 */
router.get('/payment/vnpay-ipn', MembershipController.vnpayIPN);

// =============================================
// AUTHENTICATED ROUTES
// =============================================

/**
 * @route   GET /api/membership/current
 * @desc    Get current user's membership
 * @access  Private
 */
router.get('/current', authenticate, MembershipController.getCurrentMembership);

/**
 * @route   POST /api/membership/orders
 * @desc    Create membership order
 * @access  Private
 */
router.post(
  '/orders',
  authenticateToken,
  validateMembershipOrder,
  MembershipController.createOrder
);

/**
 * @route   GET /api/membership/orders/:orderNumber
 * @desc    Get order details
 * @access  Private
 */
router.get(
  '/orders/:orderNumber',
  authenticateToken,
  MembershipController.getOrderDetails
);

/**
 * @route   GET /api/membership/history
 * @desc    Get membership history
 * @access  Private
 */
router.get('/history', authenticateToken, MembershipController.getHistory);

/**
 * @route   POST /api/membership/cancel
 * @desc    Cancel membership auto-renewal
 * @access  Private
 */
router.post('/cancel', authenticateToken, MembershipController.cancelMembership);

// =============================================
// ADMIN ROUTES
// =============================================

/**
 * @route   GET /api/membership/admin/all
 * @desc    Get all memberships (admin)
 * @access  Admin
 */
router.get(
  '/admin/all',
  authenticateToken,
  authorizeRoles(['admin', 'sub_admin']),
  MembershipController.adminGetAllMemberships
);

/**
 * @route   PUT /api/membership/admin/pricing/:tier
 * @desc    Update pricing (admin)
 * @access  Admin
 */
router.put(
  '/admin/pricing/:tier',
  authenticateToken,
  authorizeRoles(['admin']),
  MembershipController.adminUpdatePricing
);

module.exports = router;