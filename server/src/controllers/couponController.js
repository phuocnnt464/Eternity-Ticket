// server/src/controllers/couponController.js
const CouponModel = require('../models/couponModel');
const { createResponse } = require('../utils/helpers');

const CouponController = {
  async createCoupon(req, res) {
    try {
      const userId = req.user.id;
      const couponData = {
        ...req.body,
        created_by: userId
      };

      const coupon = await CouponModel.create(couponData);
      
      res.status(201).json(
        createResponse(
          true,
          'Coupon created successfully',
          { coupon }
        )
      );
    } catch (error) {
      console.error('❌ Create coupon error:', error);
      
      let statusCode = 500;
      let message = 'Failed to create coupon';
      
      if (error.message.includes('duplicate key')) {
        statusCode = 409;
        message = 'Coupon code already exists';
      }
      
      res.status(statusCode).json(
        createResponse(false, message)
      );
    }
  },

  async validateCoupon(req, res) {
    try {
      const { code, eventId, orderAmount } = req.body;
      const userId = req.user.id;
      
      // Get membership tier from user
      const membershipTier = req.user.membership?.tier || 'basic';

      const validation = await CouponModel.validateCoupon(
        code, 
        userId, 
        eventId, 
        orderAmount, 
        membershipTier
      );

      if (!validation.valid) {
        return res.status(400).json(
          createResponse(false, validation.message)
        );
      }

      res.json(
        createResponse(
          true,
          'Coupon is valid',
          {
            coupon: validation.coupon,
            discount_amount: validation.discountAmount
          }
        )
      );
    } catch (error) {
      console.error('❌ Validate coupon error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to validate coupon')
      );
    }
  },

  async getEventCoupons(req, res) {
    try {
      const { eventId } = req.params;
      
      // ✅ THÊM: Verify user has access to event
      const hasAccess = await verifyEventAccess(req.user.id, eventId);
      if (!hasAccess && !['admin', 'sub_admin'].includes(req.user.role)) {
        return res.status(403).json(
          createResponse(false, 'You do not have access to this event')
        );
      }
      
      const coupons = await CouponModel.findByEvent(eventId);
      
      res.json(
        createResponse(
          true,
          `Found ${coupons.length} coupons`,
          { coupons }
        )
      );
    } catch (error) {
      console.error('❌ Get event coupons error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to fetch coupons')
      );
    }
  },

  async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const coupon = await CouponModel.update(id, updateData);
      
      if (!coupon) {
        return res.status(404).json(
          createResponse(false, 'Coupon not found')
        );
      }

      res.json(
        createResponse(
          true,
          'Coupon updated successfully',
          { coupon }
        )
      );
    } catch (error) {
      console.error('❌ Update coupon error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to update coupon')
      );
    }
  },

  async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      
      const coupon = await CouponModel.delete(id);
      
      if (!coupon) {
        return res.status(404).json(
          createResponse(false, 'Coupon not found')
        );
      }

      res.json(
        createResponse(true, 'Coupon deleted successfully')
      );
    } catch (error) {
      console.error('❌ Delete coupon error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to delete coupon')
      );
    }
  },

  async getCouponStats(req, res) {
    try {
      const { id } = req.params;
      
      const stats = await CouponModel.getStats(id);
      
      if (!stats) {
        return res.status(404).json(
          createResponse(false, 'Coupon not found')
        );
      }

      res.json(
        createResponse(
          true,
          'Coupon statistics retrieved successfully',
          { stats }
        )
      );
    } catch (error) {
      console.error('❌ Get coupon stats error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to get coupon statistics')
      );
    }
  }
};

module.exports = CouponController;