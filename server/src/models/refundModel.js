const pool = require('../config/database');

class RefundModel {
  static async create(refundData) {
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
  }

  static async findById(id) {
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
  }

  static async findAll(filters = {}, limit = 50, offset = 0) {
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
  }

  static async updateStatus(id, status, reviewedBy, reviewNotes = null) {
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
  }

  static async approve(refundId, adminId, reviewNotes = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const refundQuery = await client.query(`
        SELECT r.*, o.total_amount, o.user_id, o.payment_method, o.id as order_id,
              u.email as user_email, 
              u.first_name || ' ' || u.last_name as user_name,
              e.title as event_title
        FROM refund_requests r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON o.user_id = u.id
        JOIN events e ON o.event_id = e.id
        WHERE r.id = $1 AND r.status = 'pending'
        FOR UPDATE
      `, [refundId]);

      if (refundQuery.rows.length === 0) {
        throw new Error('Refund request not found or already processed');
      }

      const refund = refundQuery.rows[0];

      await client.query(`
        UPDATE refund_requests 
        SET status = 'approved',
            reviewed_by = $1,
            reviewed_at = NOW(),
            review_notes = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [adminId, reviewNotes, refundId]);

      await client.query(`
        UPDATE orders 
        SET status = 'refunded',
            updated_at = NOW()
        WHERE id = $1
      `, [refund.order_id]);

      await client.query(`
        UPDATE tickets 
        SET status = 'refunded',
            refunded_at = NOW(),
            updated_at = NOW()
        WHERE order_id = $1
      `, [refund.order_id]);

      await client.query(`
        UPDATE ticket_types tt
        SET sold_quantity = sold_quantity - oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE tt.id = oi.ticket_type_id 
          AND oi.order_id = $1
      `, [refund.order_id]);

      await client.query(`
        INSERT INTO notifications (user_id, type, title, content, data)
        VALUES ($1, 'refund_approved', 'Refund Approved', $2, $3)
      `, [
        refund.user_id,
        `Your refund request for ${refund.event_title} has been approved.`,
        JSON.stringify({
          order_id: refund.order_id,
          refund_amount: refund.refund_amount,
          refund_id: refundId
        })
      ]);

      await client.query('COMMIT');

      // console.log(`Refund ${refundId} approved by admin ${adminId}`);

      // Return refund data for email
      return {
        ...refund,
        status: 'approved',
        reviewed_by: adminId,
        review_notes: reviewNotes
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Approve refund error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async reject(refundId, adminId, rejectionReason) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new Error('Rejection reason is required');
      }

      const refundQuery = await client.query(`
        SELECT r.*, o.user_id, o.id as order_id,
              u.email as user_email,
              u.first_name || ' ' || u.last_name as user_name,
              e.title as event_title
        FROM refund_requests r
        JOIN orders o ON r.order_id = o.id
        JOIN users u ON o.user_id = u.id
        JOIN events e ON o.event_id = e.id
        WHERE r.id = $1 AND r.status = 'pending'
        FOR UPDATE
      `, [refundId]);

      if (refundQuery.rows.length === 0) {
        throw new Error('Refund request not found or already processed');
      }

      const refund = refundQuery.rows[0];

      await client.query(`
        UPDATE refund_requests 
        SET status = 'rejected',
            reviewed_by = $1,
            reviewed_at = NOW(),
            review_notes = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [adminId, rejectionReason, refundId]);

      await client.query(`
        INSERT INTO notifications (user_id, type, title, content, data)
        VALUES ($1, 'refund_rejected', 'Refund Rejected', $2, $3)
      `, [
        refund.user_id,
        `Your refund request for ${refund.event_title} has been rejected.`,
        JSON.stringify({
          order_id: refund.order_id,
          refund_id: refundId,
          rejection_reason: rejectionReason
        })
      ]);

      await client.query('COMMIT');

      // console.log(`Refund ${refundId} rejected by admin ${adminId}`);

      // Return refund data for email
      return {
        ...refund,
        status: 'rejected',
        reviewed_by: adminId,
        review_notes: rejectionReason,
        rejection_reason: rejectionReason
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Reject refund error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async processRefund(id, processedBy, transactionId) {
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