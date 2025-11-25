// server/src/utils/orderCron.js (TẠO FILE MỚI)

const OrderModel = require('../models/orderModel');

class OrderCron {
  static async cancelExpiredOrders() {
    try {
      console.log('🔄 Running order expiry check...');
      
      const cancelledCount = await OrderModel.cancelExpiredOrders();
      
      if (cancelledCount > 0) {
        console.log(`✅ Cancelled ${cancelledCount} expired orders`);
      } else {
        console.log('✅ No expired orders found');
      }
      
      return cancelledCount;
    } catch (error) {
      console.error('❌ Order expiry check error:', error);
      throw error;
    }
  }

  static initialize() {
    // Run every 5 minutes
    setInterval(() => {
      this.cancelExpiredOrders().catch(console.error);
    }, 5 * 60 * 1000);

    // Run immediately on start
    this.cancelExpiredOrders().catch(console.error);

    console.log('✅ Order cron jobs initialized (running every 5 minutes)');
  }
}

module.exports = OrderCron;