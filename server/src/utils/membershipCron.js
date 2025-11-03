// server/src/utils/membershipCron.js

const pool = require('../config/database');
const emailService = require('../services/emailService');

class MembershipCron {
  /**
   * Check expiring memberships and send reminders
   */
  static async checkExpiringMemberships() {
    try {
      console.log('🔍 Checking expiring memberships...');

      // Get memberships expiring in 7, 3, and 1 days
      const query = `
        SELECT 
          m.*,
          u.email,
          u.first_name,
          u.last_name,
          EXTRACT(DAY FROM (m.end_date - NOW())) as days_left
        FROM memberships m
        JOIN users u ON m.user_id = u.id
        WHERE m.is_active = true
          AND m.end_date IS NOT NULL
          AND m.end_date > NOW()
          AND m.end_date < NOW() + INTERVAL '8 days'
          AND m.cancelled_at IS NULL
          AND EXTRACT(DAY FROM (m.end_date - NOW())) IN (7, 3, 1)
      `;

      const result = await pool.query(query);

      console.log(`📧 Found ${result.rows.length} memberships expiring soon`);

      for (const membership of result.rows) {
        const user = {
          email: membership.email,
          first_name: membership.first_name,
          last_name: membership.last_name
        };

        const daysLeft = Math.ceil(membership.days_left);

        await emailService.sendMembershipExpiryReminder(user, membership, daysLeft);

        console.log(`✅ Sent reminder to ${user.email} (${daysLeft} days left)`);
      }

      return result.rows.length;

    } catch (error) {
      console.error('❌ Error checking expiring memberships:', error);
      throw error;
    }
  }

  /**
   * Deactivate expired memberships
   */
  static async deactivateExpiredMemberships() {
    try {
      console.log('🔍 Deactivating expired memberships...');

      const query = `
        UPDATE memberships
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true
          AND end_date IS NOT NULL
          AND end_date < NOW()
        RETURNING id, user_id, tier, end_date
      `;

      const result = await pool.query(query);

      console.log(`✅ Deactivated ${result.rowCount} expired memberships`);

      return result.rowCount;

    } catch (error) {
      console.error('❌ Error deactivating expired memberships:', error);
      throw error;
    }
  }

  /**
   * Initialize cron jobs
   */
  static initialize() {
    // Run expiry check every 6 hours
    setInterval(() => {
      this.checkExpiringMemberships().catch(console.error);
    }, 6 * 60 * 60 * 1000);

    // Run deactivation check every hour
    setInterval(() => {
      this.deactivateExpiredMemberships().catch(console.error);
    }, 60 * 60 * 1000);

    // Run immediately on start
    this.checkExpiringMemberships().catch(console.error);
    this.deactivateExpiredMemberships().catch(console.error);

    console.log('✅ Membership cron jobs initialized');
  }
}

module.exports = MembershipCron;