// src/controllers/orderController.js
const OrderModel = require('../models/orderModel');
const QueueController = require('../controllers/queueController');
const pool = require('../config/database');
const { createResponse } = require('../utils/helpers');

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

      // ✅ CHECK QUEUE ACCESS
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
      // const totalTickets = orderData.tickets.reduce((sum, t) => sum + t.quantity, 0);
      
      // ✅ GET SESSION LIMITS
      // const sessionLimits = await pool.query(`
      //   SELECT min_tickets_per_order, max_tickets_per_order
      //   FROM event_sessions
      //   WHERE id = $1 AND is_active = true
      // `, [orderData.session_id]);

      // if (sessionLimits.rows.length === 0) {
      //   return res.status(400).json(
      //     createResponse(false, 'Invalid session')
      //   );
      // }

      // const { min_tickets_per_order, max_tickets_per_order } = sessionLimits.rows[0];

      // ✅ CHECK MIN TICKETS
      // if (totalTickets < min_tickets_per_order) {
      //   return res.status(400).json(
      //     createResponse(
      //       false, 
      //       `Minimum ${min_tickets_per_order} ticket(s) required per order. You selected ${totalTickets}.`
      //     )
      //   );
      // }

      // // ✅ CHECK MAX TICKETS
      // if (totalTickets > max_tickets_per_order) {
      //   return res.status(400).json(
      //     createResponse(
      //       false, 
      //       `Maximum ${max_tickets_per_order} ticket(s) allowed per order. You selected ${totalTickets}.`
      //     )
      //   );
      // }

      console.log(`Creating order for user: ${userId}, tickets: ${totalTickets}`);

      const result = await OrderModel.createOrder(userId, orderData);

      await QueueController.completeOrder(userId, orderData.session_id);

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

      // Update order status based on payment result
      const updatedOrder = await OrderModel.updateOrderStatus(orderId, {
        status: paymentResult.success ? 'paid' : 'failed',
        payment_method,
        payment_transaction_id: transactionId,
        payment_data: paymentResult,
        paid_at: paymentResult.success ? new Date() : null
      });

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
}

module.exports = OrderController;