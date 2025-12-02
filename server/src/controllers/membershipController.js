const MembershipModel = require('../models/membershipModel');
const VNPayService = require('../services/vnpayService');

class MembershipController {
  static async getPricing(req, res, next) {
    try {
      const pricing = await MembershipModel.getPricing();

      res.json({
        success: true,
        data: pricing
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentMembership(req, res, next) {
    try {
      const userId = req.user.id;
      const membership = await MembershipModel.getUserMembership(userId);

      res.json({
        success: true,
        data: membership || {
          tier: 'basic',
          is_active: true,
          features: []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { tier, billing_period, coupon_code, return_url } = req.body;

      if (!['basic', 'advanced', 'premium'].includes(tier)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid membership tier' }
        });
      }

      // Validate billing period
      if (!['monthly', 'quarterly', 'yearly'].includes(billing_period)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid billing period' }
        });
      }

      const order = await MembershipModel.createMembershipOrder(userId, {
        tier,
        billing_period,
        coupon_code
      });

      if (order.total_amount === 0) {
        await MembershipModel.completeMembershipPayment(order.id, {
          payment_method: 'free',
          payment_transaction_id: `FREE-${Date.now()}`,
          payment_data: { type: 'free_tier' }
        });

        return res.json({
          success: true,
          data: {
            order,
            payment_required: false,
            message: 'Membership activated successfully'
          }
        });
      }

      const ipAddr = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;

      const paymentUrl = VNPayService.createPaymentUrl({
        orderId: order.order_number,
        amount: order.total_amount,
        orderInfo: `Membership ${tier} - ${billing_period}`,
        orderType: 'membership',
        ipAddr,
        returnUrl: return_url || `${process.env.FRONTEND_URL}/membership/payment/result`
        // returnUrl: return_url || process.env.VNPAY_RETURN_URL
      });

      res.json({
        success: true,
        data: {
          order,
          payment_url: paymentUrl,
          payment_required: true
        }
      });

    } catch (error) {
      next(error);
    }
  }

  static async getOrderDetails(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderNumber } = req.params;

      const query = `
        SELECT * FROM membership_orders
        WHERE order_number = $1 AND user_id = $2
      `;

      const result = await require('../config/database').query(query, [orderNumber, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Order not found' }
        });
      }

      const order = result.rows[0];

      res.json({
        success: true,
        data: {
          ...order,
          amount: parseFloat(order.amount),
          discount_amount: parseFloat(order.discount_amount),
          vat_amount: parseFloat(order.vat_amount),
          total_amount: parseFloat(order.total_amount),
          payment_data: typeof order.payment_data === 'string' 
            ? JSON.parse(order.payment_data) 
            : order.payment_data
        }
      });

    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await MembershipModel.getMembershipHistory(userId);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelMembership(req, res, next) {
    try {
      const userId = req.user.id;
      const { reason, cancel_immediately = false } = req.body || {};

      const success = await MembershipModel.cancelMembership(userId, reason, cancel_immediately);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: { message: 'No active membership found' }
        });
      }

      const message = cancel_immediately
      ? 'Membership cancelled immediately. All benefits have been removed.'
      : 'Membership auto-renewal cancelled. Your membership will remain active until the end of the billing period.';

      res.json({
        success: true,
        message,
        data: { 
          cancel_immediately: cancel_immediately
        }
      });

    } catch (error) {
      next(error);
    }
  }

  static async adminGetAllMemberships(req, res, next) {
    try {
      const { page = 1, limit = 20, tier, status } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 1;

      if (tier) {
        whereConditions.push(`m.tier = $${paramCount}`);
        queryParams.push(tier);
        paramCount++;
      }

      if (status === 'active') {
        whereConditions.push(`m.is_active = true AND (m.end_date IS NULL OR m.end_date > NOW())`);
      } else if (status === 'expired') {
        whereConditions.push(`m.is_active = true AND m.end_date < NOW()`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          m.*,
          u.email,
          u.first_name,
          u.last_name,
          mo.order_number,
          mo.total_amount as payment_amount
        FROM memberships m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN membership_orders mo ON m.order_id = mo.id
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM memberships m
        ${whereClause}
      `;

      const [membershipsResult, countResult] = await Promise.all([
        require('../config/database').query(query, queryParams),
        require('../config/database').query(countQuery, queryParams.slice(0, -2))
      ]);

      const memberships = membershipsResult.rows;
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: memberships,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: totalCount,
          per_page: parseInt(limit)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  static async adminUpdatePricing(req, res, next) {
    try {
      const { tier } = req.params;
      const { monthly_price, quarterly_price, yearly_price, features, description } = req.body;

      const query = `
        UPDATE membership_pricing
        SET monthly_price = COALESCE($1, monthly_price),
            quarterly_price = COALESCE($2, quarterly_price),
            yearly_price = COALESCE($3, yearly_price),
            features = COALESCE($4, features),
            description = COALESCE($5, description),
            updated_at = NOW()
        WHERE tier = $6
        RETURNING *
      `;

      const result = await require('../config/database').query(query, [
        monthly_price,
        quarterly_price,
        yearly_price,
        features ? JSON.stringify(features) : null,
        description,
        tier
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Pricing tier not found' }
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Pricing updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  static async processPayment(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const { payment_method, payment_data } = req.body;
      const userId = req.user.id;

      // console.log(`Processing membership payment for order: ${orderNumber}, method: ${payment_method}`);

      const orderQuery = await require('../config/database').query(`
        SELECT * FROM membership_orders 
        WHERE order_number = $1 AND user_id = $2
      `, [orderNumber, userId]);

      if (orderQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Order not found' }
        });
      }

      const order = orderQuery.rows[0];

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { message: 'Order is not pending payment' }
        });
      }

      const transactionId = payment_data?.transaction_id || `MEM${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
      
      const paymentSuccess = payment_data?.mock === true 
        ? (payment_data?.success !== false)
        : true;

      if (paymentSuccess) {
        await MembershipModel.completeMembershipPayment(order.id, {
          payment_method,
          payment_transaction_id: transactionId,
          payment_data: {
            mock: payment_data?.mock === true,
            ...payment_data
          }
        });

        return res.json({
          success: true,
          message: 'Membership payment successful!',
          data: {
            order_number: orderNumber,
            transaction_id: transactionId,
            status: 'success'
          }
        });
      } else {
        await require('../config/database').query(`
          UPDATE membership_orders
          SET status = 'failed',
              payment_data = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify({ mock: true, error: 'Payment failed' }), order.id]);

        return res.status(400).json({
          success: false,
          message: 'Payment failed',
          data: {
            order_number: orderNumber,
            status: 'failed'
          }
        });
      }

    } catch (error) {
      console.error('Process membership payment error:', error);
      next(error);
    }
  }

  static async mockPayment(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const { success = true } = req.body;
      const userId = req.user.id;

      // console.log(`Mock membership payment for order: ${orderNumber}, success: ${success}`);

      // Get order
      const orderQuery = await require('../config/database').query(`
        SELECT * FROM membership_orders 
        WHERE order_number = $1 AND user_id = $2
      `, [orderNumber, userId]);

      if (orderQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Order not found' }
        });
      }

      const order = orderQuery.rows[0];

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { message: 'Order is not pending payment' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      const transactionId = `MOCK-MEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (success) {
        await MembershipModel.completeMembershipPayment(order.id, {
          payment_method: 'mock',
          payment_transaction_id: transactionId,
          payment_data: {
            mock: true,
            payment_time: new Date().toISOString()
          }
        });

        // console.log(`Mock membership payment successful: ${orderNumber}`);

        return res.json({
          success: true,
          message: 'Membership payment successful!',
          data: {
            order_number: orderNumber,
            transaction_id: transactionId,
            status: 'success',
            redirect_url: `${process.env.FRONTEND_URL}/membership/payment/result?status=success&order=${orderNumber}&txn=${transactionId}`
          }
        });
      } else {
        await require('../config/database').query(`
          UPDATE membership_orders
          SET status = 'failed',
              payment_data = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify({ mock: true, error: 'Simulated payment failure' }), order.id]);

        return res.json({
          success: false,
          message: 'Payment failed',
          data: {
            order_number: orderNumber,
            status: 'failed',
            redirect_url: `${process.env.FRONTEND_URL}/membership/payment/result?status=failed&order=${orderNumber}`
          }
        });
      }

    } catch (error) {
      console.error('Mock membership payment error:', error);
      next(error);
    }
  }
}

module.exports = MembershipController;