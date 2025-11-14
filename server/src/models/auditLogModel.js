const pool = require('../config/database');

class AuditLogModel {
  /**
   * Create audit log entry
   */
  static async create(logData) {
    const query = `
      INSERT INTO admin_audit_logs (
        admin_id, action, target_type, target_id,
        old_values, new_values, description, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      logData.admin_id,
      logData.action,
      logData.target_type,
      logData.target_id,
      JSON.stringify(logData.old_values || {}),
      JSON.stringify(logData.new_values || {}),
      logData.description,
      logData.ip_address
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

   /**
   * Find all audit logs with filters
   */
  static async findAll(filters = {}, limit = 100, offset = 0) {
    let query = `
      SELECT aal.*, 
        u.email as admin_email,
        u.first_name || ' ' || u.last_name as admin_name
      FROM admin_audit_logs aal
      LEFT JOIN users u ON aal.admin_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.admin_id) {
      query += ` AND aal.admin_id = $${paramCount}`;
      values.push(filters.admin_id);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND aal.action = $${paramCount}`;
      values.push(filters.action);
      paramCount++;
    }

    if (filters.target_type) {
      query += ` AND aal.target_type = $${paramCount}`;
      values.push(filters.target_type);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND aal.created_at >= $${paramCount}`;
      values.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND aal.created_at <= $${paramCount}`;
      values.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY aal.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    
    // Get total count
    const countQuery = query.split('ORDER BY')[0].replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, values.slice(0, -2));
    
    return {
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    };
  }

  /**
   * Find audit logs by target
   */
  static async findByTarget(targetType, targetId) {
    const query = `
      SELECT aal.*, 
        u.email as admin_email,
        u.first_name || ' ' || u.last_name as admin_name
      FROM admin_audit_logs aal
      LEFT JOIN users u ON aal.admin_id = u.id
      WHERE aal.target_type = $1 AND aal.target_id = $2
      ORDER BY aal.created_at DESC
    `;
    const result = await pool.query(query, [targetType, targetId]);
    return result.rows;
  }
};

module.exports = AuditLogModel;