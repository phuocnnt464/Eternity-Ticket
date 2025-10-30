// server/src/middleware/earlyAccessMiddleware.js
const { createResponse } = require('../utils/helpers');
const pool = require('../config/database');

/**
 * Check early access for premium members
 */
const checkEarlyAccess = async (req, res, next) => {
  try {
    const { session_id, tickets } = req.body;
    
    if (!session_id || !tickets || tickets.length === 0) {
      return next();
    }

    const ticketTypeIds = tickets.map(t => t.ticket_type_id);
    const userTier = req.user.membership_tier || 'basic';

    // Get tickets with early access
    const result = await pool.query(`
      SELECT 
        tt.id,
        tt.name,
        tt.sale_start_time,
        tt.premium_early_access_minutes
      FROM ticket_types tt
      WHERE tt.id = ANY($1)
        AND tt.premium_early_access_minutes > 0
    `, [ticketTypeIds]);

    if (result.rows.length === 0) {
      return next(); // No early access tickets
    }

    const now = new Date();

    for (const ticketType of result.rows) {
      const saleStartTime = new Date(ticketType.sale_start_time);
      const earlyAccessStart = new Date(
        saleStartTime.getTime() - ticketType.premium_early_access_minutes * 60000
      );

      // Check if in early access period
      if (now >= earlyAccessStart && now < saleStartTime) {
        if (userTier !== 'premium') {
          const minutesRemaining = Math.ceil((saleStartTime - now) / 60000);
          
          return res.status(403).json(
            createResponse(
              false,
              `${ticketType.name} is in Premium early access period. Public sale starts in ${minutesRemaining} minutes.`,
              {
                ticket_type: ticketType.name,
                public_sale_start: saleStartTime,
                current_tier: userTier,
                required_tier: 'premium'
              }
            )
          );
        }
      }
    }

    next();
  } catch (error) {
    console.error('Early access check error:', error);
    next(); // Don't block on error
  }
};

module.exports = { checkEarlyAccess };