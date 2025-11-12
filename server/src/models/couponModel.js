const pool = require('../config/database');

const CouponModel = {
  async create(couponData) {
    const query = `
      INSERT INTO coupons (
        code, title, description, event_id, created_by, type,
        discount_value, max_discount_amount, min_order_amount,
        usage_limit, usage_limit_per_user, valid_from, valid_until,
        membership_tiers, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    const values = [
      couponData.code, couponData.title, couponData.description,
      couponData.event_id, couponData.created_by, couponData.type,
      couponData.discount_value, couponData.max_discount_amount,
      couponData.min_order_amount, couponData.usage_limit,
      couponData.usage_limit_per_user, couponData.valid_from,
      couponData.valid_until, couponData.membership_tiers, true
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findByCode(code, eventId = null) {
    const query = `
      SELECT * FROM coupons 
      WHERE code = $1 
        AND (event_id = $2 OR event_id IS NULL OR $2 IS NULL)
        AND is_active = true
        AND valid_from <= NOW() 
        AND valid_until >= NOW()
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `;
    const result = await pool.query(query, [code, eventId]);
    return result.rows[0];
  },

  async validateCoupon(code, userId, eventId, orderAmount, membershipTier) {
    const coupon = await this.findByCode(code, eventId);
    
    if (!coupon) {
      return { valid: false, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' };
    }

    // Check membership tier restriction
    if (coupon.membership_tiers && coupon.membership_tiers.length > 0) {
      if (!coupon.membership_tiers.includes(membershipTier)) {
        return { valid: false, message: 'Mã giảm giá này chỉ dành cho hội viên đặc biệt' };
      }
    }

    // Check minimum order amount
    if (coupon.min_order_amount && orderAmount < coupon.min_order_amount) {
      return { 
        valid: false, 
        message: `Đơn hàng phải tối thiểu ${coupon.min_order_amount.toLocaleString()}₫` 
      };
    }

    // Check user usage limit
    if (coupon.usage_limit_per_user) {
      const usageQuery = `
        SELECT COUNT(*) as count 
        FROM coupon_usages 
        WHERE coupon_id = $1 AND user_id = $2
      `;
      const usageResult = await pool.query(usageQuery, [coupon.id, userId]);
      const userUsageCount = parseInt(usageResult.rows[0].count);

      if (userUsageCount >= coupon.usage_limit_per_user) {
        return { valid: false, message: 'Bạn đã sử dụng hết số lần áp dụng mã này' };
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (orderAmount * coupon.discount_value) / 100;
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    return { 
      valid: true, 
      coupon, 
      discountAmount: Math.min(discountAmount, orderAmount)
    };
  },

  async recordUsage(couponId, userId, orderId, discountAmount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Increment usage count
      await client.query(
        'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
        [couponId]
      );

      // Record usage
      await client.query(
        `INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount)
         VALUES ($1, $2, $3, $4)`,
        [couponId, userId, orderId, discountAmount]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findByEvent(eventId) {
    const query = `
      SELECT c.*, 
        (c.usage_limit IS NULL OR c.used_count < c.usage_limit) as is_available
      FROM coupons c
      WHERE c.event_id = $1 AND c.is_active = true
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM coupons WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE coupons 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'UPDATE coupons SET is_active = false WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
};

module.exports = CouponModel;