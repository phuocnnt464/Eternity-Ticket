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
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(cu.id) as total_uses,
          COALESCE(SUM(cu.discount_amount), 0) as total_discount_given,
          u.first_name || ' ' || u.last_name as created_by_name
        FROM coupons c
        LEFT JOIN coupon_usages cu ON c.id = cu.coupon_id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.event_id = $1 OR (c.event_id IS NULL AND $1 IS NULL)
        GROUP BY c.id, u.first_name, u.last_name
        ORDER BY c.created_at DESC
      `;
      
      const result = await pool.query(query, [eventId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch event coupons: ${error.message}`);
    }
  },

  async findById(id) {
    const query = 'SELECT * FROM coupons WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = [
        'title', 'description', 'discount_value', 'max_discount_amount',
        'min_order_amount', 'usage_limit', 'usage_limit_per_user',
        'valid_from', 'valid_until', 'membership_tiers', 'is_active'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          values.push(updateData[field]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE coupons
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update coupon: ${error.message}`);
    }
  },

  async delete(id) {
    try {
      // Soft delete - just deactivate
      const query = `
        UPDATE coupons
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to delete coupon: ${error.message}`);
    }
  },

  async getStats(id) {
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(cu.id) as total_uses,
          COUNT(DISTINCT cu.user_id) as unique_users,
          COALESCE(SUM(cu.discount_amount), 0) as total_discount_given,
          COALESCE(AVG(cu.discount_amount), 0) as avg_discount_per_use,
          MIN(cu.used_at) as first_use,
          MAX(cu.used_at) as last_use
        FROM coupons c
        LEFT JOIN coupon_usages cu ON c.id = cu.coupon_id
        WHERE c.id = $1
        GROUP BY c.id
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const stats = result.rows[0];
      
      // Calculate usage rate
      const usageRate = stats.usage_limit 
        ? (stats.total_uses / stats.usage_limit * 100).toFixed(2)
        : 0;
      
      return {
        ...stats,
        usage_rate: parseFloat(usageRate),
        is_expired: new Date() > new Date(stats.valid_until),
        is_active: stats.is_active && new Date() <= new Date(stats.valid_until)
      };
    } catch (error) {
      throw new Error(`Failed to get coupon stats: ${error.message}`);
    }
  },

  async recordUsage(couponId, userId, orderId, discountAmount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert usage record
      await client.query(`
        INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount, used_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [couponId, userId, orderId, discountAmount]);

      // Increment used_count
      await client.query(`
        UPDATE coupons
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [couponId]);

      await client.query('COMMIT');
      
      console.log(`✅ Coupon usage recorded: ${couponId} by user ${userId}`);
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to record coupon usage: ${error.message}`);
    } finally {
      client.release();
    }
  },
};

module.exports = CouponModel;