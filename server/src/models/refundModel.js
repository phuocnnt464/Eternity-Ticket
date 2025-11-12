const pool = require('../config/database');

const RefundModel = {
  async create(refundData) {
    const query = `
      INSERT INTO refund_requests (
        order_id, user_id, reason, description, refund_amount, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;
    const values = [
      refundData.order_id,
      refundData.user_id,
      refundData.reason,
      refundData.description,
      refundData.refund_amount
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findById(id) {
    const query = `
      SELECT rr.*, 
        o.order_number,
        u.email as user_email,
        u.first_name || ' ' || u.last_name as user_name,
        e.title as event_title
      FROM refund_requests rr
      JOIN orders o ON rr.order_id = o.id
      JOIN users u ON rr.user_id = u.id
      JOIN events e ON o.event_id = e.id
      WHERE rr.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findAll(filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT rr.*, 
        o.order_number,
        u.email as user_email,
        u.first_name || ' ' || u.last_name as user_name,
        e.title as event_title
      FROM refund_requests rr
      JOIN orders o ON rr.order_id = o.id
      JOIN users u ON rr.user_id = u.id
      JOIN events e ON o.event_id = e.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND rr.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND rr.user_id = $${paramCount}`;
      values.push(filters.user_id);
      paramCount++;
    }

    if (filters.reason) {
      query += ` AND rr.reason = $${paramCount}`;
      values.push(filters.reason);
      paramCount++;
    }

    query += ` ORDER BY rr.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  },

  async updateStatus(id, status, reviewedBy, reviewNotes = null) {
    const query = `
      UPDATE refund_requests 
      SET status = $1, 
          reviewed_by = $2, 
          reviewed_at = NOW(),
          review_notes = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [status, reviewedBy, reviewNotes, id]);
    return result.rows[0];
  },

  async processRefund(id, processedBy, transactionId) {
    const query = `
      UPDATE refund_requests 
      SET status = 'completed',
          processed_by = $1,
          processed_at = NOW(),
          refunded_at = NOW(),
          refund_transaction_id = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [processedBy, transactionId, id]);
    return result.rows[0];
  }
};

module.exports = RefundModel;