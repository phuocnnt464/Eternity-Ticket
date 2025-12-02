const express = require('express');
const rateLimit = require('express-rate-limit');
const OrderController = require('../controllers/orderController');
const { 
  authenticateToken, 
  authorizeRoles,
  checkPurchaseCooldown,
  checkEarlyAccess
} = require('../middleware/authMiddleware');
const { validate, validateUUIDParam } = require('../middleware/validationMiddleware');
const {
  createOrderSchema,
  processPaymentSchema,
  orderQuerySchema,
  orderParamSchema
} = require('../validations/orderValidation');

const router = express.Router();

const orderCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Too many order attempts, please try again later.',
    retry_after: '1 hour'
  }
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    message: 'Too many payment attempts, please try again later.'
  }
});

router.use(authenticateToken);

router.post('/',
  orderCreationLimiter,
  authorizeRoles('participant'),
  checkPurchaseCooldown,
  checkEarlyAccess,
  validate(createOrderSchema),
  OrderController.createOrder
);

router.get('/',
  validate(orderQuerySchema, 'query'),
  OrderController.getUserOrders
);

router.get('/:orderId',
  validate(orderParamSchema, 'params'),
  OrderController.getOrder
);

router.post('/:orderId/payment',
  paymentLimiter,
  validate(orderParamSchema, 'params'),
  validate(processPaymentSchema),
  OrderController.processPayment
);

router.put('/:orderId/cancel',
  validate(orderParamSchema, 'params'),
  OrderController.cancelOrder
);

router.get('/:orderId/tickets',
  validate(orderParamSchema, 'params'),
  OrderController.getOrderTickets
);

router.get('/:orderId/download-pdf',
  validate(orderParamSchema, 'params'),
  OrderController.downloadTicketsPDF
);

router.post('/cleanup/expired',
  authorizeRoles('admin', 'sub_admin'),
  OrderController.cleanupExpiredOrders
);

router.post('/:orderId/payment/mock',
  authenticateToken,
  validateUUIDParam('orderId'),
  OrderController.mockPayment
);

module.exports = router;