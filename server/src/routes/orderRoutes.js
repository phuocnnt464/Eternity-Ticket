// src/routes/orderRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const OrderController = require('../controllers/orderController');
const { 
  authenticateToken, 
  authorizeRoles,
  checkPurchaseCooldown,
  checkEarlyAccess
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createOrderSchema,
  processPaymentSchema,
  orderQuerySchema,
  orderParamSchema
} = require('../validations/orderValidation');

const router = express.Router();

// Rate limiting for order operations
const orderCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 order attempts per hour
  message: {
    success: false,
    message: 'Too many order attempts, please try again later.',
    retry_after: '1 hour'
  }
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many payment attempts, please try again later.'
  }
});

// All order routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private (Participant)
 */
router.post('/',
  orderCreationLimiter,
  authorizeRoles('participant'),
  checkPurchaseCooldown,
  checkEarlyAccess,
  validate(createOrderSchema),
  OrderController.createOrder
);

/**
 * @route   GET /api/orders
 * @desc    Get user orders with pagination and filtering
 * @access  Private
 */
router.get('/',
  validate(orderQuerySchema, 'query'),
  OrderController.getUserOrders
);

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get order by ID
 * @access  Private (Order Owner or Admin)
 */
router.get('/:orderId',
  validate(orderParamSchema, 'params'),
  OrderController.getOrder
);

/**
 * @route   POST /api/orders/:orderId/payment
 * @desc    Process payment for order
 * @access  Private (Order Owner)
 */
router.post('/:orderId/payment',
  paymentLimiter,
  validate(orderParamSchema, 'params'),
  validate(processPaymentSchema),
  OrderController.processPayment
);

/**
 * @route   PUT /api/orders/:orderId/cancel
 * @desc    Cancel pending order
 * @access  Private (Order Owner)
 */
router.put('/:orderId/cancel',
  validate(orderParamSchema, 'params'),
  OrderController.cancelOrder
);

/**
 * @route   GET /api/orders/:orderId/tickets
 * @desc    Get order tickets (for download/view)
 * @access  Private (Order Owner)
 */
router.get('/:orderId/tickets',
  validate(orderParamSchema, 'params'),
  OrderController.getOrderTickets
);

// Admin routes

/**
 * @route   POST /api/orders/cleanup/expired
 * @desc    Cleanup expired orders (Admin/Cron job)
 * @access  Private (Admin)
 */
router.post('/cleanup/expired',
  authorizeRoles('admin', 'sub_admin'),
  OrderController.cleanupExpiredOrders
);

module.exports = router;