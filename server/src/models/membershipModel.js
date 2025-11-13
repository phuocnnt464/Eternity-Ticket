// server/src/models/membershipModel.js
const pool = require('../config/database');
const { generateOrderNumber } = require('../utils/helpers');

class MembershipModel {
  /**
   * Get membership pricing
   * @returns {Array} Pricing tiers
   */
  static async getPricing() {
    try {
      const query = `
        SELECT * FROM membership_pricing
        WHERE is_active = true
        ORDER BY sort_order, monthly_price
      `;
      
      const result = await pool.query(query);
      
      return result.rows.map(tier => ({
        ...tier,
        monthly_price: parseFloat(tier.monthly_price),
        quarterly_price: tier.quarterly_price ? parseFloat(tier.quarterly_price) : null,
        yearly_price: tier.yearly_price ? parseFloat(tier.yearly_price) : null,
        features: typeof tier.features === 'string' ? JSON.parse(tier.features) : tier.features
      }));
    } catch (error) {
      throw new Error(`Failed to get pricing: ${error.message}`);
    }
  }

  /**
   * Get user's active membership
   * @param {String} userId - User ID
   * @returns {Object|null} Active membership
   */
  static async getUserMembership(userId) {
    try {
      const query = `
        SELECT m.*, mp.features, mp.description
        FROM memberships m
        LEFT JOIN membership_pricing mp ON m.tier = mp.tier
        WHERE m.user_id = $1 
          AND m.is_active = true
          AND (m.end_date IS NULL OR m.end_date > NOW())
        ORDER BY m.created_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const membership = result.rows[0];
      
      return {
        ...membership,
        payment_amount: membership.payment_amount ? parseFloat(membership.payment_amount) : null,
        features: typeof membership.features === 'string' ? JSON.parse(membership.features) : membership.features
      };
    } catch (error) {
      throw new Error(`Failed to get user membership: ${error.message}`);
    }
  }

  /**
   * Create membership order
   * @param {String} userId - User ID
   * @param {Object} orderData - Order data
   * @returns {Object} Created order
   */
  static async createMembershipOrder(userId, orderData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        tier,
        billing_period, // 'monthly', 'quarterly', 'yearly'
        coupon_code
      } = orderData;

      // Get pricing
      const pricingQuery = await client.query(`
        SELECT * FROM membership_pricing
        WHERE tier = $1 AND is_active = true
      `, [tier]);

      if (pricingQuery.rows.length === 0) {
        throw new Error('Invalid membership tier');
      }

      const pricing = pricingQuery.rows[0];

      // Calculate price based on billing period
      let amount;
      let months;
      
      switch (billing_period) {
        case 'monthly':
          amount = parseFloat(pricing.monthly_price);
          months = 1;
          break;
        case 'quarterly':
          amount = parseFloat(pricing.quarterly_price || pricing.monthly_price * 3);
          months = 3;
          break;
        case 'yearly':
          amount = parseFloat(pricing.yearly_price || pricing.monthly_price * 12);
          months = 12;
          break;
        default:
          throw new Error('Invalid billing period');
      }

      // Check if user already has active membership
      const currentMembership = await this.getUserMembership(userId);
      const isRenewal = currentMembership && currentMembership.tier === tier;
      const isUpgrade = currentMembership && currentMembership.tier !== tier;

      // Calculate dates
      const startDate = currentMembership && currentMembership.end_date > new Date() 
        ? new Date(currentMembership.end_date)
        : new Date();
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      // Apply coupon if provided
      let discountAmount = 0;
      if (coupon_code) {
        // TODO: Implement coupon logic
        // console.log(`Applying coupon: ${coupon_code}`);

        // ✅ Validate and apply coupon
        const CouponModel = require('./couponModel');
        
        try {
          const couponValidation = await CouponModel.validateCoupon(
            coupon_code,
            userId,
            null, // event_id = null for membership
            amount,
            'basic' // Default tier for validation
          );
          
          if (couponValidation.valid) {
            discountAmount = couponValidation.discountAmount;
            console.log(`✅ Coupon ${coupon_code} applied: -${discountAmount}₫`);
            
            // Record coupon usage after payment success
            // (Move to completeMembershipPayment function)
          } else {
            console.warn(`⚠️ Invalid coupon: ${couponValidation.message}`);
            // Optionally throw error or just ignore
            // throw new Error(couponValidation.message);
          }
        } catch (couponError) {
          console.error('Coupon validation error:', couponError);
          // Continue without coupon
        }
      }

      // Calculate VAT (10%)
      const vatAmount = (amount - discountAmount) * 0.10;
      const totalAmount = amount - discountAmount + vatAmount;

      // Generate order number
      const orderNumber = `MEM-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // Create membership order
      const orderQuery = `
        INSERT INTO membership_orders (
          order_number, user_id, tier, billing_period,
          start_date, end_date, amount, discount_amount,
          vat_amount, total_amount, status, is_renewal,
          previous_tier, coupon_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderNumber, userId, tier, billing_period,
        startDate, endDate, amount, discountAmount,
        vatAmount, totalAmount, 'pending', isRenewal,
        currentMembership ? currentMembership.tier : null,
        coupon_code
      ]);

      const order = orderResult.rows[0];

      await client.query('COMMIT');

      console.log(`Membership order created: ${orderNumber}`);

      return {
        ...order,
        amount: parseFloat(order.amount),
        discount_amount: parseFloat(order.discount_amount),
        vat_amount: parseFloat(order.vat_amount),
        total_amount: parseFloat(order.total_amount)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete membership payment
   * @param {String} orderId - Order ID
   * @param {Object} paymentData - Payment data
   * @returns {Object} Updated membership
   */
  static async completeMembershipPayment(orderId, paymentData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        payment_method,
        payment_transaction_id,
        payment_data
      } = paymentData;

      // Get order
      const orderQuery = await client.query(`
        SELECT * FROM membership_orders WHERE id = $1
      `, [orderId]);

      if (orderQuery.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderQuery.rows[0];

      if (order.status === 'paid') {
        throw new Error('Order already paid');
      }

      // Update order status
      await client.query(`
        UPDATE membership_orders
        SET status = 'paid',
            payment_method = $1,
            payment_transaction_id = $2,
            payment_data = $3,
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
      `, [payment_method, payment_transaction_id, JSON.stringify(payment_data), orderId]);

      // Deactivate old membership
      await client.query(`
        UPDATE memberships
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1 AND is_active = true
      `, [order.user_id]);

      // Create new membership
      const membershipQuery = `
        INSERT INTO memberships (
          user_id, tier, start_date, end_date,
          payment_amount, payment_date, payment_method,
          payment_transaction_id, billing_period,
          next_billing_date, order_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, true)
        RETURNING *
      `;

      const membershipResult = await client.query(membershipQuery, [
        order.user_id,
        order.tier,
        order.start_date,
        order.end_date,
        order.total_amount,
        payment_method,
        payment_transaction_id,
        order.billing_period,
        order.end_date, // Next billing date = end date
        orderId
      ]);

      // ✅ Record coupon usage if coupon was applied
      if (order.coupon_code && order.discount_amount > 0) {
        const CouponModel = require('./couponModel');
        
        // Get coupon details
        const coupon = await CouponModel.findByCode(order.coupon_code);
        
        if (coupon) {
          await CouponModel.recordUsage(
            coupon.id,
            order.user_id,
            orderId,
            order.discount_amount
          );
          console.log(`✅ Coupon usage recorded: ${order.coupon_code}`);
        }
      }

      await client.query('COMMIT');

      console.log(`Membership activated: ${order.tier} for user ${order.user_id}`);

      return membershipResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel membership
   * @param {String} userId - User ID
   * @param {String} reason - Cancellation reason
   * @returns {Boolean} Success status
   */
  static async cancelMembership(userId, reason) {
    try {
      const query = `
        UPDATE memberships
        SET auto_renewal = false,
            cancelled_at = NOW(),
            cancellation_reason = $2,
            updated_at = NOW()
        WHERE user_id = $1 AND is_active = true
        RETURNING *
      `;

      const result = await pool.query(query, [userId, reason]);

      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to cancel membership: ${error.message}`);
    }
  }

  /**
   * Get membership history
   * @param {String} userId - User ID
   * @returns {Array} Membership history
   */
  static async getMembershipHistory(userId) {
    try {
      const query = `
        SELECT 
          mo.*,
          m.id as membership_id,
          m.is_active as membership_active
        FROM membership_orders mo
        LEFT JOIN memberships m ON mo.id = m.order_id
        WHERE mo.user_id = $1
        ORDER BY mo.created_at DESC
      `;

      const result = await pool.query(query, [userId]);

      return result.rows.map(order => ({
        ...order,
        amount: parseFloat(order.amount),
        discount_amount: parseFloat(order.discount_amount),
        vat_amount: parseFloat(order.vat_amount),
        total_amount: parseFloat(order.total_amount),
        payment_data: typeof order.payment_data === 'string' ? JSON.parse(order.payment_data) : order.payment_data
      }));
    } catch (error) {
      throw new Error(`Failed to get membership history: ${error.message}`);
    }
  }
}

module.exports = MembershipModel;