const RefundModel = require('../models/refundModel');
const OrderModel = require('../models/orderModel');
const EmailService = require('../services/emailService');

class RefundController {
  static async createRefundRequest(req, res) {
    try {
      const userId = req.user.id;
      const { orderId, reason, description } = req.body;

      // Verify order belongs to user
      const order = await OrderModel.findById(orderId);
      if (!order || order.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.status === 'refunded') {
        return res.status(400).json({
          success: false,
          message: 'Order has already been refunded'
        });
      }

      if (order.status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Only paid orders can be refunded'
        });
      }

      const refundData = {
        order_id: orderId,
        user_id: userId,
        reason,
        description,
        refund_amount: order.total_amount
      };

      const refund = await RefundModel.create(refundData);

      // Send notification email
      await EmailService.sendRefundRequestConfirmation(order.customer_info.email, {
        orderNumber: order.order_number,
        refundAmount: order.total_amount
      });

      res.status(201).json({
        success: true,
        message: 'Refund request submitted successfully',
        data: refund
      });
    } catch (error) {
      console.error('Create refund request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create refund request',
        error: error.message
      });
    }
  }

  static async getRefundRequests(req, res) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const filters = {};
      if (status) filters.status = status;
      
      // If not admin, only show user's own requests
      if (req.user.role !== 'admin' && req.user.role !== 'sub_admin') {
        filters.user_id = req.user.id;
      }

      const result = await RefundModel.findAll(filters, parseInt(limit), offset);

      // res.json({
      //   success: true,
      //   data: refunds,
      //   pagination: {
      //     page: parseInt(page),
      //     limit: parseInt(limit)
      //   }
      // });

      res.json({
        success: true,
        data: {
          refunds: result.refunds || result,  // Tùy thuộc vào cấu trúc Model trả về
          pagination: {
            current_page: parseInt(page),
            total_pages: result.total_pages || Math.ceil((result.total_count || 0) / limit),
            total_count: result.total_count || 0,
            per_page: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get refund requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch refund requests',
        error: error.message
      });
    }
  }

  static async getMyRefundRequests(req, res) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const filters = { user_id: userId };
        const refunds = await RefundModel.findAll(filters, parseInt(limit), offset);

        res.json({
        success: true,
        data: refunds,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
        }
        });
    } catch (error) {
        console.error('Get my refund requests error:', error);
        res.status(500).json({
        success: false,
        message: 'Failed to fetch refund requests',
        error: error.message
        });
    }
  }

  static async getRefundById(req, res) {
    try {
        const { id } = req.params;
        const refund = await RefundModel.findById(id);
        
        if (!refund) {
        return res.status(404).json({
            success: false,
            message: 'Refund request not found'
        });
        }

        // Check authorization
        if (req.user.role !== 'admin' && req.user.role !== 'sub_admin' && refund.user_id !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
        }

        res.json({
        success: true,
        data: refund
        });
    } catch (error) {
        console.error('Get refund by ID error:', error);
        res.status(500).json({
        success: false,
        message: 'Failed to fetch refund request',
        error: error.message
        });
    }
    }

  static async approveRefund(req, res) {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const adminId = req.user.id;

      // Use RefundModel.approve with full transaction handling
      const refundData = await RefundModel.approve(id, adminId, reviewNotes);

      // Send approval email
      try {
        const emailService = require('../services/emailService');
        await emailService.sendRefundApprovalEmail({
          email: refundData.user_email,
          user_name: refundData.user_name,
          order_number: refundData.order_number,
          event_title: refundData.event_title,
          refund_amount: parseFloat(refundData.refund_amount),
          review_notes: reviewNotes
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the request on email error
      }

      res.json({
        success: true,
        message: 'Refund request approved successfully',
        data: {
          refund_id: id,
          status: 'approved'
        }
      });
    } catch (error) {
      console.error('❌ Approve refund error:', error);
      
      let statusCode = 500;
      let message = 'Failed to approve refund request';
      
      if (error.message.includes('not found') || error.message.includes('already processed')) {
        statusCode = 404;
        message = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        message,
        error: error.message
      });
    }
  }

  static async rejectRefund(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const adminId = req.user.id;

      // Use RefundModel.reject with full transaction handling
      const refundData = await RefundModel.reject(id, adminId, rejectionReason);

      // Send rejection email
      try {
        const emailService = require('../services/emailService');
        await emailService.sendRefundRejectionEmail({
          email: refundData.user_email,
          user_name: refundData.user_name,
          order_number: refundData.order_number,
          event_title: refundData.event_title,
          refund_amount: parseFloat(refundData.refund_amount),
          rejection_reason: rejectionReason
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      res.json({
        success: true,
        message: 'Refund request rejected',
        data: {
          refund_id: id,
          status: 'rejected'
        }
      });
    } catch (error) {
      console.error('❌ Reject refund error:', error);
      
      let statusCode = 500;
      let message = 'Failed to reject refund request';
      
      if (error.message.includes('not found') || error.message.includes('already processed')) {
        statusCode = 404;
        message = error.message;
      } else if (error.message.includes('required')) {
        statusCode = 400;
        message = error.message;
      }
      
      res.status(statusCode).json({
        success: false,
        message,
        error: error.message
      });
    }
  }

  static async processRefund(req, res) {
    const pool = require('../config/database');
    const client = await pool.connect();
  
    try {
      const { id } = req.params;
      const { transactionId } = req.body;
      const adminId = req.user.id;

      // Start transaction
      await client.query('BEGIN');

      // 1. Get refund details
      const refund = await RefundModel.findById(id);
      
      if (!refund) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Refund request not found'
        });
      }
      
      if (refund.status !== 'approved') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Only approved refunds can be processed'
        });
      }

      // 2. Update refund to completed
      await client.query(`
        UPDATE refund_requests 
        SET status = 'completed',
            processed_by = $1,
            processed_at = NOW(),
            refunded_at = NOW(),
            refund_transaction_id = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [adminId, transactionId, id]);

      // 3. Update order status to refunded
      await client.query(`
        UPDATE orders 
        SET status = 'refunded',
            updated_at = NOW()
        WHERE id = $1
      `, [refund.order_id]);

      // 4. Update tickets to refunded
      await client.query(`
        UPDATE tickets 
        SET status = 'refunded',
            refunded_at = NOW(),
            updated_at = NOW()
        WHERE order_id = $1
      `, [refund.order_id]);

      // 5. Restore ticket quantities
      await client.query(`
        UPDATE ticket_types tt
        SET sold_quantity = sold_quantity - oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE tt.id = oi.ticket_type_id 
          AND oi.order_id = $1
      `, [refund.order_id]);

      // 6. Create notification
      await client.query(`
        INSERT INTO notifications (user_id, type, title, content, data)
        VALUES ($1, 'refund_completed', 'Refund Completed', $2, $3)
      `, [
        refund.user_id,
        `Your refund for order ${refund.order_number} has been completed.`,
        JSON.stringify({
          order_id: refund.order_id,
          refund_amount: refund.refund_amount,
          transaction_id: transactionId
        })
      ]);

      await client.query('COMMIT');

      // 7. Send email (outside transaction)
      try {
        const emailService = require('../services/emailService');
        await emailService.sendRefundCompletedEmail({
          email: refund.user_email,
          user_name: refund.user_name,
          order_number: refund.order_number,
          refund_amount: refund.refund_amount,
          transaction_id: transactionId
        });
      } catch (emailError) {
        console.error('Failed to send refund completed email:', emailError);
        // Don't rollback transaction on email error
      }

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refund_id: id,
          order_id: refund.order_id,
          transaction_id: transactionId,
          refund_amount: refund.refund_amount
        }
      });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  }
};

module.exports = RefundController;