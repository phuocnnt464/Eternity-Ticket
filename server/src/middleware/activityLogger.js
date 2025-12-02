const pool = require('../config/database');

const logActivity = (action, entityType) => {
  return async (req, res, next) => {
    const originalJson = res.json;

    res.on('finish', () => {
      res.json = originalJson;
    });

    res.on('close', () => {
      res.json = originalJson;
    });

    res.on('error', () => {
      res.json = originalJson;
    });
    
    res.json = function(data) {
      if (data.success && req.user && res.statusCode >= 200 && res.statusCode < 300) {
        
        const entityId = req.params.userId 
          || req.params.eventId 
          || req.params.orderId 
          || (data.data && data.data.id)
          || null;
        
        const description = `${action} ${entityType}${entityId ? ` (ID: ${entityId})` : ''}`;
        
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
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

const logAdminAudit = (action, targetType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.on('finish', () => {
      res.json = originalJson;
    });

    res.on('close', () => {
      res.json = originalJson;
    });

    res.on('error', () => {
      res.json = originalJson;
    });
    
    res.json = function(data) {
      if (data.success && req.user && ['admin', 'sub_admin'].includes(req.user.role)) {
        const targetId = req.params.userId 
          || req.params.eventId 
          || req.params.orderId
          || req.params.refundId
          || req.params.id
          || (data.data && data.data.id) 
          || null;
        
        const query = `
          INSERT INTO admin_audit_logs 
          (admin_id, action, target_type, target_id, old_values, new_values, description, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        pool.query(query, [
          req.user.id,
          action,
          targetType,
          targetId,
          null, 
          data.data ? JSON.stringify(data.data) : null, 
          `Admin ${action} ${targetType}${targetId ? ` (ID: ${targetId})` : ''}`,
          req.ip
        ]).catch(err => console.error('❌ Admin audit log error:', err.message));
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// const logAdminAuditWithValues = (action, targetType) => {
//   return async (req, res, next) => {
//     // Capture old values before operation
//     const oldValues = await captureCurrentState(req);
    
//     const originalJson = res.json;
    
//     res.json = function(data) {
//       if (data.success) {
//         const newValues = data.data; // New state after operation
        
//         const query = `
//           INSERT INTO admin_audit_logs 
//           (admin_id, action, target_type, target_id, old_values, new_values, description)
//           VALUES ($1, $2, $3, $4, $5, $6, $7)
//         `;
        
//         pool.query(query, [
//           req.user.id,
//           action,
//           targetType,
//           req.params.userId,
//           JSON.stringify(oldValues),
//           JSON.stringify(newValues),
//           `Admin ${action} ${targetType}`
//         ]).catch(err => console.error(err));
//       }
      
//       return originalJson.call(this, data);
//     };
    
//     next();
//   };
// };

// const logSensitiveDataChange = (action, entityType, oldValues, newValues) => {
//   return async (req, res, next) => {
//     const originalJson = res.json;
    
//     res.json = function(data) {
//       if (data.success && req.user) {
//         const query = `
//           INSERT INTO admin_audit_logs 
//           (admin_id, action, target_type, target_id, old_values, new_values, description, ip_address)
//           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//         `;
        
//         pool.query(query, [
//           req.user.id,
//           action,
//           entityType,
//           req.params.userId || req.params.eventId,
//           JSON.stringify(oldValues),
//           JSON.stringify(newValues),
//           `${action} ${entityType}`,
//           req.ip
//         ]).catch(err => console.error(err));
//       }
      
//       return originalJson.call(this, data);
//     };
    
//     next();
//   };
// };

module.exports = { 
  logActivity, 
  logAdminAudit,
  // logAdminAuditWithValues,
  // logSensitiveDataChange
};