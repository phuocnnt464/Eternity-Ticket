const CouponModel = require('../models/couponModel');

const CouponController = {
  async createCoupon(req, res) {
    try {
      const userId = req.user.id;
      const couponData = {
        ...req.body,
        created_by: userId
      };

      const coupon = await CouponModel.create(couponData);
      
      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: coupon
      });
    } catch (error) {
      console.error('Create coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create coupon',
        error: error.message
      });
    }
  },

  async validateCoupon(req, res) {
    try {
      const { code, eventId, orderAmount } = req.body;
      const userId = req.user.id;
      const membershipTier = req.user.membershipTier || 'basic';

      const validation = await CouponModel.validateCoupon(
        code, 
        userId, 
        eventId, 
        orderAmount, 
        membershipTier
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      res.json({
        success: true,
        message: 'Coupon is valid',
        data: {
          coupon: validation.coupon,
          discountAmount: validation.discountAmount
        }
      });
    } catch (error) {
      console.error('Validate coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coupon',
        error: error.message
      });
    }
  },

  async getEventCoupons(req, res) {
    try {
      const { eventId } = req.params;
      const coupons = await CouponModel.findByEvent(eventId);
      
      res.json({
        success: true,
        data: coupons
      });
    } catch (error) {
      console.error('Get event coupons error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: error.message
      });
    }
  },

  async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const coupon = await CouponModel.update(id, updateData);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      res.json({
        success: true,
        message: 'Coupon updated successfully',
        data: coupon
      });
    } catch (error) {
      console.error('Update coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coupon',
        error: error.message
      });
    }
  },

  async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      const coupon = await CouponModel.delete(id);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      console.error('Delete coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete coupon',
        error: error.message
      });
    }
  },

  async getCouponStats(req, res) {
        try {
        const { id } = req.params;
        
        const coupon = await CouponModel.findById(id);
        if (!coupon) {
        return res.status(404).json({
            success: false,
            message: 'Coupon not found'
        });
        }

        // Get usage statistics
        const pool = require('../config/database');
        const statsQuery = `
        SELECT 
            COUNT(DISTINCT cu.user_id) as unique_users,
            COUNT(cu.id) as total_uses,
            SUM(cu.discount_amount) as total_discount,
            AVG(cu.discount_amount) as avg_discount,
            MAX(cu.used_at) as last_used
        FROM coupon_usages cu
        WHERE cu.coupon_id = $1
        `;
        
        const statsResult = await pool.query(statsQuery, [id]);
        const stats = statsResult.rows[0];

        res.json({
        success: true,
        data: {
            coupon,
            stats: {
            unique_users: parseInt(stats.unique_users) || 0,
            total_uses: parseInt(stats.total_uses) || 0,
            total_discount: parseFloat(stats.total_discount) || 0,
            avg_discount: parseFloat(stats.avg_discount) || 0,
            last_used: stats.last_used,
            remaining_uses: coupon.usage_limit ? coupon.usage_limit - coupon.used_count : null
            }
        }
        });
    } catch (error) {
        console.error('Get coupon stats error:', error);
        res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon statistics',
        error: error.message
        });
    }
  }
};

module.exports = CouponController;