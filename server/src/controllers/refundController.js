const RefundModel = require('../models/refundModel');
const OrderModel = require('../models/orderModel');
const EmailService = require('../services/emailService');

const RefundController = {
  async createRefundRequest(req, res) {
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
  },

  async getRefundRequests(req, res) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const filters = {};
      if (status) filters.status = status;
      
      // If not admin, only show user's own requests
      if (req.user.role !== 'admin' && req.user.role !== 'sub_admin') {
        filters.user_id = req.user.id;
      }

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
      console.error('Get refund requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch refund requests',
        error: error.message
      });
    }
  },

  async getMyRefundRequests(req, res) {
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
  },

  async getRefundById(req, res) {
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
    },

  async approveRefund(req, res) {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const adminId = req.user.id;

      const refund = await RefundModel.findById(id);
      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund request not found'
        });
      }

      if (refund.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Refund request has already been processed'
        });
      }

      const updatedRefund = await RefundModel.updateStatus(
        id, 
        'approved', 
        adminId, 
        reviewNotes
      );

      // Send approval email
      await EmailService.sendEmail(
        refund.user_email,
        'refund_approved',
        {
          order_number: refund.order_number,
          refund_amount: refund.refund_amount
        }
      );

      res.json({
        success: true,
        message: 'Refund request approved successfully',
        data: updatedRefund
      });
    } catch (error) {
      console.error('Approve refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve refund request',
        error: error.message
      });
    }
  },

  async rejectRefund(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const adminId = req.user.id;

      const refund = await RefundModel.findById(id);
      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund request not found'
        });
      }

      const updatedRefund = await RefundModel.updateStatus(
        id, 
        'rejected', 
        adminId, 
        rejectionReason
      );

      // Send rejection email
      await EmailService.sendEmail(
        refund.user_email,
        'refund_rejected',
        {
          order_number: refund.order_number,
          reason: rejectionReason
        }
      );

      res.json({
        success: true,
        message: 'Refund request rejected',
        data: updatedRefund
      });
    } catch (error) {
      console.error('Reject refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject refund request',
        error: error.message
      });
    }
  },

  async processRefund(req, res) {
    try {
      const { id } = req.params;
      const { transactionId } = req.body;
      const adminId = req.user.id;

      const refund = await RefundModel.findById(id);
      if (!refund || refund.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Invalid refund request'
        });
      }

      const processedRefund = await RefundModel.processRefund(id, adminId, transactionId);

      // Update order status and tickets
      await OrderModel.update(refund.order_id, { status: 'refunded' });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: processedRefund
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