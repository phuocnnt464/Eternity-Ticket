// src/controllers/orderController.js
const OrderModel = require('../models/orderModel');
const QueueController = require('../controllers/queueController');
const pool = require('../config/database');
const { createResponse } = require('../utils/helpers');
const PDFService = require('../services/pdfService');

class OrderController {
  /**
   * Create new order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createOrder(req, res) {
    try {
      const userId = req.user.id;
      const orderData = req.body;

      // CHECK QUEUE ACCESS
      const canPurchase = await QueueController.checkCanPurchase(
        userId, 
        orderData.session_id
      );

      if (!canPurchase) {
        return res.status(403).json(
          createResponse(
            false,
            'You must join the waiting room first. You are not in an active purchase slot.',
            {
              action_required: 'join_queue',
              waiting_room_enabled: true
            }
          )
        );
      }

      // ✅ VALIDATE TOTAL TICKETS
      const totalTickets = orderData.tickets.reduce((sum, t) => sum + t.quantity, 0);

      console.log(`Creating order for user: ${userId}, tickets: ${totalTickets}`);
      
      let result;
      try {
        result = await OrderModel.createOrder(userId, orderData);

        await QueueController.completeOrder(userId, orderData.session_id);
        
      } catch (error) {
        // ✅ FAIL: Still cleanup Redis to free slot
        console.error(`Order creation failed for user ${userId}:`, error.message);
        try {
          const QueueModel = require('../models/queueModel');
          await QueueModel.removeActiveUser(orderData.session_id, userId);
          await QueueController.processQueue(orderData.session_id);
          console.log(`✅ Freed Redis slot after order failure for user ${userId}`);
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup Redis after order error:', cleanupError);
        }

        throw error; // Re-throw to handle in outer catch
      }


      const response = createResponse(
        true,
        'Order created successfully! You have 15 minutes to complete payment.',
        {
          order: result.order,
          tickets_count: result.tickets.length,
          reserved_until: result.order.reserved_until
        }
      );

      res.status(201).json(response);

    } catch (error) {
      console.error('Create order error:', error.message);

      let statusCode = 500;
      let message = 'Failed to create order';

      if (error.message.includes('Invalid session or event')) {
        statusCode = 400;
        message = 'Invalid session or event selected';
      } else if (error.message.includes('Not enough tickets available')) {
        statusCode = 409;
        message = error.message;
      } else if (error.message.includes('Invalid quantity')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message.includes('not available for sale')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message.includes('Cannot order more than')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message.includes('System is busy')) {
        statusCode = 503;
        message = error.message;
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get order by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.role === 'admin' ? null : req.user.id;

      console.log(`Getting order: ${orderId} for user: ${userId || 'admin'}`);

      const order = await OrderModel.findById(orderId, userId);

      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }

      const response = createResponse(
        true,
        'Order retrieved successfully',
        { order }
      );

      res.json(response);

    } catch (error) {
      console.error('Get order error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve order'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Get user orders
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      console.log(`Getting orders for user: ${userId}`);

      const result = await OrderModel.getUserOrders(userId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      const response = createResponse(
        true,
        `Found ${result.orders.length} orders`,
        result
      );

      res.json(response);

    } catch (error) {
      console.error('Get user orders error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve orders'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Process payment (simplified mock implementation)
   * @param {Object} req - Express request object  
   * @param {Object} res - Express response object
   */
  static async processPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { payment_method, payment_data } = req.body;
      const userId = req.user.id;

      console.log(`Processing payment for order: ${orderId}`);

      // Get order and verify ownership
      const order = await OrderModel.findById(orderId, userId);

      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }

      if (order.status !== 'pending') {
        return res.status(400).json(
          createResponse(false, 'Order is not pending payment')
        );
      }

      // Check if order is still valid (not expired)
      if (new Date() > new Date(order.reserved_until)) {
        // Cancel expired order
        await OrderModel.updateOrderStatus(orderId, {
          status: 'cancelled',
          paid_at: null
        });

        return res.status(410).json(
          createResponse(false, 'Order has expired. Please create a new order.')
        );
      }

      // Mock payment processing
      let paymentResult;
      let transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

      if (payment_method === 'vnpay') {
        // In real implementation, this would integrate with VNPay API
        paymentResult = {
          success: true,
          transaction_id: transactionId,
          response_code: '00',
          message: 'Payment successful'
        };
      } else {
        const isSuccess = Math.random() > 0.1; // 90% success rate
        // Mock other payment methods
        paymentResult = {
          success: isSuccess,
          transaction_id: transactionId,
          response_code: isSuccess ? '00' : '01',
          message: isSuccess ? 'Payment successful' : 'Payment failed'
        };
      }

      let updatedOrder;
      // Update order status based on payment result
      try {
        updatedOrder = await OrderModel.updateOrderStatus(orderId, {
          status: paymentResult.success ? 'paid' : 'failed',
          payment_method,
          payment_transaction_id: transactionId,
          payment_data: paymentResult,
          paid_at: paymentResult.success ? new Date() : null
        });
      } catch (statusUpdateError) {
        console.error('❌ CRITICAL: Failed to update order status after payment:', statusUpdateError);
        
        // ✅ Log to database for manual intervention
        const pool = require('../config/database');
        await pool.query(`
          INSERT INTO payment_failures (order_id, payment_data, error, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [orderId, JSON.stringify(paymentResult), statusUpdateError.message]);
        
        return res.status(500).json(createResponse(
          false,
          'Payment processing error. Our team has been notified. Please contact support.',
          { transaction_id: transactionId }
        ));
      } 

      if (paymentResult.success) {
        const response = createResponse(
          true,
          'Payment processed successfully! Check your email for tickets.',
          {
            order: updatedOrder,
            transaction_id: transactionId,
            payment_status: 'success'
          }
        );

        res.json(response);
      } else {
        const response = createResponse(
          false,
          'Payment failed. Please try again or use a different payment method.',
          {
            transaction_id: transactionId,
            payment_status: 'failed'
          }
        );

        res.status(400).json(response);
      }

    } catch (error) {
      console.error('Process payment error:', error.message);
      
      const response = createResponse(
        false,
        'Payment processing failed. Please try again.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Cancel order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async cancelOrder(req, res) { 
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      console.log(`Cancelling order: ${orderId} for user: ${userId}`);

      // Get order and verify ownership
      const order = await OrderModel.findById(orderId, userId);

      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }

      if (order.status !== 'pending') {
        return res.status(400).json(
          createResponse(false, 'Only pending orders can be cancelled')
        );
      }

      // Cancel order
      await OrderModel.updateOrderStatus(orderId, {
        status: 'cancelled',
        paid_at: null
      });

      const response = createResponse(
        true,
        'Order cancelled successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('Cancel order error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to cancel order'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Get order tickets (for download/view)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getOrderTickets(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      console.log(`Getting tickets for order: ${orderId}`);

      const order = await OrderModel.findById(orderId, userId);

      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }

      if (order.status !== 'paid') {
        return res.status(400).json(
          createResponse(false, 'Tickets are only available for paid orders')
        );
      }

      const response = createResponse(
        true,
        'Tickets retrieved successfully',
        {
          order: {
            order_number: order.order_number,
            event_title: order.event_title,
            session_title: order.session_title,
            session_start_time: order.session_start_time,
            venue_name: order.venue_name
          },
          tickets: order.tickets.map(ticket => ({
            id: ticket.id,
            ticket_code: ticket.ticket_code,
            ticket_type_name: ticket.ticket_type_name,
            holder_name: ticket.holder_name,
            qr_code_image_url: ticket.qr_code_image_url,
            is_checked_in: ticket.is_checked_in,
            checked_in_at: ticket.checked_in_at
          }))
        }
      );

      res.json(response);

    } catch (error) {
      console.error('Get order tickets error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve tickets'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Cleanup expired orders (admin/cron job)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async cleanupExpiredOrders(req, res) {
    try {
      console.log('Running expired orders cleanup');

      const cancelledCount = await OrderModel.cancelExpiredOrders();

      const response = createResponse(
        true,
        `Cleanup completed. ${cancelledCount} expired orders cancelled.`,
        { cancelled_orders: cancelledCount }
      );

      res.json(response);

    } catch (error) {
      console.error('Cleanup expired orders error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to cleanup expired orders'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Download order tickets as PDF
   * GET /api/orders/:orderId/download-pdf
   */
  static async downloadTicketsPDF(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await OrderModel.findById(orderId, userId);

      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }

      if (order.status !== 'paid') {
        return res.status(400).json(
          createResponse(false, 'PDF is only available for paid orders')
        );
      }
      
      const pdfBuffer = await PDFService.generateOrderTicketsPDF(order.tickets);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 
        `attachment; filename="tickets-${order.order_number}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Download PDF error:', error.message);
      res.status(500).json(
        createResponse(false, 'Failed to generate PDF')
      );
    }
  }

  /**
  * Get VNPay payment URL
  * POST /api/orders/:orderId/payment/vnpay
  */
  static async getVNPayURL(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await OrderModel.findById(orderId, userId);

      if (!order) {
        return res.status(404).json(
          createResponse(false, 'Order not found')
        );
      }

      if (order.status !== 'pending') {
        return res.status(400).json(
          createResponse(false, 'Order is not pending payment')
        );
      }

      // Check expiry
      if (new Date() > new Date(order.reserved_until)) {
        await OrderModel.updateOrderStatus(orderId, {
          status: 'cancelled',
          paid_at: null
        });

        return res.status(410).json(
          createResponse(false, 'Order has expired')
        );
      }

      // Generate VNPay URL
      const VNPayService = require('../services/vnpayService');
      const ipAddr = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.ip;

      const paymentUrl = VNPayService.createPaymentUrl({
        orderId: order.order_number,
        amount: order.total_amount,
        orderInfo: `Payment for order ${order.order_number}`,
        orderType: 'billpayment',
        ipAddr,
        returnUrl: `${process.env.FRONTEND_URL}/payment/result`
      });

      res.json(createResponse(
        true,
        'VNPay payment URL generated',
        {
          payment_url: paymentUrl,
          order_number: order.order_number,
          expires_at: order.reserved_until
        }
      ));

    } catch (error) {
      console.error('Get VNPay URL error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to generate payment URL')
      );
    }
  }

  /**
   * VNPay return callback
   * GET /api/orders/payment/vnpay-return
   */
  static async vnpayReturn(req, res) {
    try {
      const vnpayParams = req.query;
      const VNPayService = require('../services/vnpayService');

      // Verify signature
      const isValid = VNPayService.verifyReturnUrl(vnpayParams);

      if (!isValid) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Invalid_signature`
        );
      }

      const orderNumber = vnpayParams.vnp_TxnRef;
      const responseCode = vnpayParams.vnp_ResponseCode;
      const transactionId = vnpayParams.vnp_TransactionNo;

      // Find order
      const orderResult = await pool.query(
        'SELECT * FROM orders WHERE order_number = $1',
        [orderNumber]
      );

      if (orderResult.rows.length === 0) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Order_not_found`
        );
      }

      const order = orderResult.rows[0];

      // Check if already processed
      if (order.status === 'paid') {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=success&order=${orderNumber}`
        );
      }

      // Validate amount
      const vnpAmount = parseInt(vnpayParams.vnp_Amount) / 100;
      if (Math.abs(vnpAmount - parseFloat(order.total_amount)) > 0.01) {
        console.error(`❌ Amount mismatch. VNP: ${vnpAmount}, Order: ${order.total_amount}`);
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Amount_mismatch`
        );
      }

      // Check order expiry
      if (new Date() > new Date(order.reserved_until)) {
        console.error(`❌ Order ${orderNumber} expired before payment`);
        
        await OrderModel.updateOrderStatus(order.id, {
          status: 'expired_paid',
          payment_method: 'vnpay',
          payment_transaction_id: transactionId,
          payment_data: vnpayParams,
          paid_at: new Date()
        });
        
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Order_expired`
        );
      }

      // Process payment
      if (responseCode === '00') {
        await OrderModel.updateOrderStatus(order.id, {
          status: 'paid',
          payment_method: 'vnpay',
          payment_transaction_id: transactionId,
          payment_data: vnpayParams,
          paid_at: new Date()
        });

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=success&order=${orderNumber}`
        );
      } else {
        await OrderModel.updateOrderStatus(order.id, {
          status: 'failed',
          payment_method: 'vnpay',
          payment_data: vnpayParams,
          paid_at: null
        });

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?status=failed&code=${responseCode}`
        );
      }

    } catch (error) {
      console.error('VNPay return error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/result?status=error`
      );
    }
  }

  /**
   * VNPay IPN callback (server-to-server)
   * GET /api/orders/payment/vnpay-ipn
   */
  static async vnpayIPN(req, res) {
    try {
      const vnpayParams = req.query;
      
      // ✅ Validate required fields
      if (!vnpayParams.vnp_TxnRef || 
          !vnpayParams.vnp_ResponseCode || 
          !vnpayParams.vnp_TransactionNo ||
          !vnpayParams.vnp_SecureHash) {
        console.error('❌ VNPay IPN missing required parameters');
        return res.json({ RspCode: '97', Message: 'Missing params' });
      }

      const VNPayService = require('../services/vnpayService');

      // ✅ Verify signature
      const isValid = VNPayService.verifyReturnUrl(vnpayParams);

      if (!isValid) {
        console.error('❌ VNPay IPN invalid signature');
        return res.json({ RspCode: '97', Message: 'Invalid signature' });
      }

      const orderNumber = vnpayParams.vnp_TxnRef;
      const responseCode = vnpayParams.vnp_ResponseCode;
      const transactionId = vnpayParams.vnp_TransactionNo;

      // ✅ Find order
      const orderResult = await pool.query(
        'SELECT * FROM orders WHERE order_number = $1',
        [orderNumber]
      );

      if (orderResult.rows.length === 0) {
        console.error(`❌ VNPay IPN order not found: ${orderNumber}`);
        return res.json({ RspCode: '01', Message: 'Order not found' });
      }

      const order = orderResult.rows[0];

      // ✅ Idempotency check
      if (order.status === 'paid') {
        console.log(`✅ VNPay IPN order already paid: ${orderNumber}`);
        return res.json({ RspCode: '00', Message: 'Already confirmed' });
      }

      // ✅ Validate amount
      const vnpAmount = parseInt(vnpayParams.vnp_Amount) / 100;
      if (Math.abs(vnpAmount - parseFloat(order.total_amount)) > 0.01) {
        console.error(`❌ VNPay IPN amount mismatch. VNP: ${vnpAmount}, Order: ${order.total_amount}`);
        return res.json({ RspCode: '04', Message: 'Amount mismatch' });
      }

      // ✅ Process payment
      if (responseCode === '00') {
        await OrderModel.updateOrderStatus(order.id, {
          status: 'paid',
          payment_method: 'vnpay',
          payment_transaction_id: transactionId,
          payment_data: vnpayParams,
          paid_at: new Date()
        });

        console.log(`✅ VNPay IPN payment confirmed: ${orderNumber}`);
        return res.json({ RspCode: '00', Message: 'Confirm success' });
      } else {
        await OrderModel.updateOrderStatus(order.id, {
          status: 'failed',
          payment_method: 'vnpay',
          payment_data: vnpayParams,
          paid_at: null
        });

        console.log(`❌ VNPay IPN payment failed: ${orderNumber}, code: ${responseCode}`);
        return res.json({ RspCode: responseCode, Message: 'Payment failed' });
      }

    } catch (error) {
      console.error('❌ VNPay IPN error:', error);
      return res.json({ RspCode: '99', Message: 'Unknown error' });
    }
  }

  /**
   * Debug VNPay configuration
   * GET /api/orders/debug/vnpay
   */
  static async debugVNPay(req, res) {
    try {
      const VNPayService = require('../services/vnpayService');
      
      // Check credentials
      const hasCredentials = !!process.env.VNPAY_TMN_CODE && !!process.env.VNPAY_HASH_SECRET;
      
      // Generate test URL
      let testUrl = null;
      let error = null;
      
      if (hasCredentials) {
        try {
          testUrl = VNPayService.createPaymentUrl({
            orderId: 'TEST-ORDER-001',
            amount: 100000,
            orderInfo: 'Test payment',
            orderType: 'billpayment',
            ipAddr: '127.0.0.1',
            returnUrl: `${process.env.FRONTEND_URL}/payment/result`
          });
        } catch (err) {
          error = err.message;
        }
      }
      
      res.json({
        success: true,
        data: {
          credentials_configured: hasCredentials,
          tmn_code: process.env.VNPAY_TMN_CODE || 'NOT_SET',
          tmn_code_length: process.env.VNPAY_TMN_CODE?.length || 0,
          hash_secret_length: process.env.VNPAY_HASH_SECRET?.length || 0,
          vnpay_url: process.env.VNPAY_URL || 'NOT_SET',
          frontend_url: process.env.FRONTEND_URL || 'NOT_SET',
          test_payment_url: testUrl,
          error: error
        }
      });
      
    } catch (error) {
      console.error('Debug VNPay error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = OrderController;