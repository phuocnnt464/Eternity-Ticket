const pool = require('../config/database');

/**
 * Log user activity after successful operations
 * @param {String} action - Action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {String} entityType - Entity type (USER, EVENT, ORDER, etc.)
 */
const logActivity = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override res.json to intercept response
    res.json = function(data) {
      // Log only successful operations (status 2xx) by authenticated users
      if (data.success && req.user && res.statusCode >= 200 && res.statusCode < 300) {
        
        // Extract entity ID from params or body
        const entityId = req.params.userId 
          || req.params.eventId 
          || req.params.orderId 
          || (data.data && data.data.id)
          || null;
        
        // Build description
        const description = `${action} ${entityType}${entityId ? ` (ID: ${entityId})` : ''}`;
        
        // Insert log asynchronously (don't wait)
        const logQuery = `
          INSERT INTO activity_logs 
          (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        pool.query(logQuery, [
          req.user.id,
          action,
          entityType,
          entityId,
          description,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent') || 'unknown'
        ]).catch(err => {
          console.error('❌ Activity log error:', err.message);
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = { logActivity };