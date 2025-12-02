const OrderModel = require('../models/orderModel');
const QueueController = require('../controllers/queueController');
const pool = require('../config/database');
const { createResponse } = require('../utils/helpers');
const PDFService = require('../services/pdfService');

class OrderController {
  static async createOrder(req, res) {
    try {
      const userId = req.user.id;
      const orderData = req.body;

      const canPurchase = await QueueController.checkCanPurchase(
        userId, 
        orderData.session_id
      );

      if (!canPurchase) {
        return res.status(403).json(
          createResponse(
            false,
            'You must join the waiting room first.',
            {
              action_required: 'join_queue',
              waiting_room_enabled: true
            }
          )
        );
      }

      const totalTickets = orderData.tickets.reduce((sum, t) => sum + t.quantity, 0);

      console.log(`Creating order for user: ${userId}, tickets: ${totalTickets}`);
      
      let result;
      try {
        result = await OrderModel.createOrder(userId, orderData);

        await QueueController.completeOrder(userId, orderData.session_id);
        
      } catch (error) {
        console.error(`Order creation failed for user ${userId}:`, error.message);
        try {
          const QueueModel = require('../models/queueModel');
          await QueueModel.removeActiveUser(orderData.session_id, userId);
          await QueueController.processQueue(orderData.session_id);
          console.log(`Freed Redis slot after order failure for user ${userId}`);
        } catch (cleanupError) {
          console.error('Failed to cleanup Redis after order error:', cleanupError);
        }

        throw error; 
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

  static async processPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { payment_method, payment_data } = req.body;
      const userId = req.user.id;

      console.log(`Processing payment for order: ${orderId}, method: ${payment_method}`);

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

      if (new Date() > new Date(order.reserved_until)) {
        await OrderModel.updateOrderStatus(orderId, {
          status: 'cancelled',
          paid_at: null
        });

        return res.status(410).json(
          createResponse(false, 'Order has expired. Please create a new order.')
        );
      }

      let paymentResult;
      let transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

      if (payment_data?.mock === true) {
        paymentResult = {
          success: payment_data?.success !== false, 
          transaction_id: transactionId,
          response_code: payment_data?.success !== false ? '00' : '01',
          message: payment_data?.success !== false ? 'Payment successful' : 'Payment failed'
        };
      } else {
        paymentResult = {
          success: true,
          transaction_id: transactionId,
          response_code: '00',
          message: 'Payment successful'
        };
      }

      let updatedOrder;
      try {
        updatedOrder = await OrderModel.updateOrderStatus(orderId, {
          status: paymentResult.success ? 'paid' : 'failed',
          payment_method,
          payment_transaction_id: transactionId,
          payment_data: paymentResult,
          paid_at: paymentResult.success ? new Date() : null
        });
      } catch (statusUpdateError) {
        console.error('CRITICAL: Failed to update order status after payment:', statusUpdateError);
        
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
          'Payment processed successfully!',
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
          'Payment failed.',
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

  static async cancelOrder(req, res) { 
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // console.log(`Cancelling order: ${orderId} for user: ${userId}`);

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

  static async getOrderTickets(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      
      // console.log(`Getting tickets for order: ${orderId}`);

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

  static async mockPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { success = true } = req.body; 
      const userId = req.user.id;

      // console.log(`Mock payment for order: ${orderId}, success: ${success}`);

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

      await new Promise(resolve => setTimeout(resolve, 1000));

      const transactionId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (success) {
        await OrderModel.updateOrderStatus(orderId, {
          status: 'paid',
          payment_method: 'mock',
          payment_transaction_id: transactionId,
          payment_data: {
            mock: true,
            payment_time: new Date().toISOString()
          },
          paid_at: new Date()
        });

        // console.log(`Mock payment successful: ${order.order_number}`);

        return res.json(createResponse(
          true,
          'Payment successful!',
          {
            order_number: order.order_number,
            transaction_id: transactionId,
            redirect_url: `${process.env.FRONTEND_URL}/payment/result?status=success&order=${order.order_number}&txn=${transactionId}`
          }
        ));
      } else {
        await OrderModel.updateOrderStatus(orderId, {
          status: 'failed',
          payment_method: 'mock',
          payment_data: {
            mock: true,
            error: 'Simulated payment failure'
          },
          paid_at: null
        });

        console.log(`Mock payment failed: ${order.order_number}`);

        return res.json(createResponse(
          false,
          'Payment failed',
          {
            order_number: order.order_number,
            redirect_url: `${process.env.FRONTEND_URL}/payment/result?status=failed&order=${order.order_number}`
          }
        ));
      }

    } catch (error) {
      console.error('Mock payment error:', error);
      res.status(500).json(
        createResponse(false, 'Payment processing failed')
      );
    }
  }
}

module.exports = OrderController;