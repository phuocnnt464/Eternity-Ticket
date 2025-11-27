// src/models/sessionTicketModel.js
const pool = require('../config/database');

class SessionTicketModel {
  /**
   * Create event session
   * @param {String} eventId - Event ID
   * @param {Object} sessionData - Session data
   * @returns {Object} Created session
   */
  static async createSession(eventId, sessionData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify event exists and user has permission
      const eventCheck = await client.query(`
        SELECT e.id, e.organizer_id, eom.role
        FROM events e
        LEFT JOIN event_organizer_members eom ON e.id = eom.event_id 
        WHERE e.id = $1 AND (e.organizer_id = $2 OR (eom.user_id = $2 AND eom.role IN ('owner', 'manager')))
      `, [eventId, sessionData.created_by]);

      if (eventCheck.rows.length === 0) {
        throw new Error('Event not found or access denied');
      }

      const {
        title,
        description,
        start_time,
        end_time,
        min_tickets_per_order = 1,
        max_tickets_per_order = 10,
        sort_order = 0
      } = sessionData;

      // Validate dates
      if (new Date(start_time) >= new Date(end_time)) {
        throw new Error('Start time must be before end time');
      }

      const sessionQuery = `
        INSERT INTO event_sessions (
          event_id, title, description, start_time, end_time,
          min_tickets_per_order, max_tickets_per_order, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const sessionValues = [
        eventId, title, description, start_time, end_time,
        min_tickets_per_order, max_tickets_per_order, sort_order
      ];

      const result = await client.query(sessionQuery, sessionValues);
      await client.query('COMMIT');

      console.log(`✅ Event session created: ${title} for event ${eventId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sessions for event
   * @param {String} eventId - Event ID
   * @returns {Array} Event sessions
   */
  static async getEventSessions(eventId) {
    try {
      const query = `
        SELECT 
          es.*,
          COUNT(tt.id) as ticket_type_count,
          SUM(tt.total_quantity) as total_tickets,
          COALESCE(SUM(
            (SELECT COUNT(*)
            FROM tickets t
            JOIN orders o ON t.order_id = o.id
            WHERE t.ticket_type_id = tt.id AND o.status = 'paid')
          ), 0)  as sold_tickets,
          COALESCE(SUM(tt.total_quantity) - SUM(
            (SELECT COUNT(*)
            FROM tickets t
            JOIN orders o ON t.order_id = o.id
            WHERE t.ticket_type_id = tt.id AND o.status = 'paid')
          ), 0) as available_quantity,
          MIN(tt.price) as min_price,
          MAX(tt.price) as max_price
        FROM event_sessions es
        LEFT JOIN ticket_types tt ON es.id = tt.session_id AND tt.is_active = true
        WHERE es.event_id = $1 AND es.is_active = true
        GROUP BY es.id
        ORDER BY es.sort_order, es.start_time
      `;

      const result = await pool.query(query, [eventId]);
      
      return result.rows.map(session => ({
        ...session,
        ticket_type_count: parseInt(session.ticket_type_count) || 0,
        total_tickets: parseInt(session.total_tickets) || 0,
        sold_tickets: parseInt(session.sold_tickets) || 0,
        available_quantity: parseInt(session.available_quantity) || 0,
        min_price: session.min_price ? parseFloat(session.min_price) : null,
        max_price: session.max_price ? parseFloat(session.max_price) : null
      }));

    } catch (error) {
      throw new Error(`Failed to fetch event sessions: ${error.message}`);
    }
  }

  /**
   * Create ticket type
   * @param {String} sessionId - Session ID
   * @param {Object} ticketData - Ticket type data
   * @returns {Object} Created ticket type
   */
  static async createTicketType(sessionId, ticketData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify session exists and get event info
      const sessionCheck = await client.query(`
        SELECT es.id, es.event_id, e.organizer_id
        FROM event_sessions es
        JOIN events e ON es.event_id = e.id
        WHERE es.id = $1 AND es.is_active = true
      `, [sessionId]);

      if (sessionCheck.rows.length === 0) {
        throw new Error('Session not found');
      }

      const { event_id } = sessionCheck.rows[0];

      const {
        name,
        description,
        price,
        total_quantity,
        min_quantity_per_order = 1,
        max_quantity_per_order = 10,
        sale_start_time,
        sale_end_time,
        premium_early_access_minutes = 0,
        sort_order = 0
      } = ticketData;

      // Validate data
      if (price < 0) {
        throw new Error('Price cannot be negative');
      }

      if (total_quantity < 1) {
        throw new Error('Total quantity must be at least 1');
      }

      if (new Date(sale_start_time) >= new Date(sale_end_time)) {
        throw new Error('Sale start time must be before sale end time');
      }

      const ticketQuery = `
        INSERT INTO ticket_types (
          event_id, session_id, name, description, price, total_quantity,
          min_quantity_per_order, max_quantity_per_order,
          sale_start_time, sale_end_time, premium_early_access_minutes, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const ticketValues = [
        event_id, sessionId, name, description, price, total_quantity,
        min_quantity_per_order, max_quantity_per_order,
        sale_start_time, sale_end_time, premium_early_access_minutes, sort_order
      ];

      const result = await client.query(ticketQuery, ticketValues);
      await client.query('COMMIT');

      console.log(`✅ Ticket type created: ${name} for session ${sessionId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get ticket types for session
   * @param {String} sessionId - Session ID
   * @returns {Array} Ticket types
   */
  static async getSessionTicketTypes(sessionId) {
    try {
      const query = `
        SELECT 
          tt.*,
          COALESCE((
            SELECT COUNT(*)
            FROM tickets t
            JOIN orders o ON t.order_id = o.id
            WHERE t.ticket_type_id = tt.id AND o.status = 'paid'
          ), 0) as sold_quantity,
          (tt.total_quantity - COALESCE((
            SELECT COUNT(*)
            FROM tickets t
            JOIN orders o ON t.order_id = o.id
            WHERE t.ticket_type_id = tt.id AND o.status = 'paid'
          ), 0)) as available_quantity,
          CASE 
            WHEN NOW() < tt.sale_start_time THEN 'not_started'
            WHEN NOW() > tt.sale_end_time THEN 'ended'
            WHEN (SELECT COUNT(*)
                  FROM tickets t
                  JOIN orders o ON t.order_id = o. id
                  WHERE t.ticket_type_id = tt.id AND o.status = 'paid') >= tt.total_quantity 
            THEN 'sold_out'
            ELSE 'available'
          END as sale_status
        FROM ticket_types tt
        WHERE tt.session_id = $1 AND tt.is_active = true
        ORDER BY tt.sort_order, tt.price
      `;

      const result = await pool.query(query, [sessionId]);
      
      return result.rows.map(ticket => ({
        ...ticket,
        price: parseFloat(ticket.price),
        total_quantity: parseInt(ticket.total_quantity),
        sold_quantity: parseInt(ticket.sold_quantity),
        available_quantity: parseInt(ticket.available_quantity),
        min_quantity_per_order: parseInt(ticket.min_quantity_per_order),
        max_quantity_per_order: parseInt(ticket.max_quantity_per_order),
        premium_early_access_minutes: parseInt(ticket.premium_early_access_minutes)
      }));

    } catch (error) {
      throw new Error(`Failed to fetch ticket types: ${error.message}`);
    }
  }

  /**
   * Get single session with details
   */
  static async getSessionById(sessionId) {
    const query = `
      SELECT 
        es.*,
        e.title as event_title,
        COUNT(tt.id) as ticket_type_count
      FROM event_sessions es
      JOIN events e ON es.event_id = e.id
      LEFT JOIN ticket_types tt ON es.id = tt.session_id AND tt.is_active = true
      WHERE es.id = $1 AND es.is_active = true
      GROUP BY es.id, e.title
    `;
    
    const result = await pool.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  /**
 * Get single ticket type with availability
  */
  static async getTicketTypeById(ticketTypeId) {
    const query = `
      SELECT 
        tt.*,
        es.title as session_title,
        e.title as event_title,
        (tt.total_quantity - tt.sold_quantity) as available_quantity,
        CASE 
          WHEN NOW() < tt.sale_start_time THEN 'not_started'
          WHEN NOW() > tt.sale_end_time THEN 'ended'
          WHEN tt.sold_quantity >= tt.total_quantity THEN 'sold_out'
          ELSE 'available'
        END as sale_status
      FROM ticket_types tt
      JOIN event_sessions es ON tt.session_id = es.id
      JOIN events e ON tt.event_id = e.id
      WHERE tt.id = $1 AND tt.is_active = true
    `;
    
    const result = await pool.query(query, [ticketTypeId]);
    return result.rows[0] || null;
  }

  /**
   * Update session
   * @param {String} sessionId - Session ID
   * @param {Object} updateData - Update data
   * @param {String} userId - User ID for permission check
   * @returns {Object} Updated session
   */
  static async updateSession(sessionId, updateData, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check permission
      const permissionCheck = await client.query(`
        SELECT es.id 
        FROM event_sessions es
        JOIN events e ON es.event_id = e.id
        LEFT JOIN event_organizer_members eom ON e.id = eom.event_id
        WHERE es.id = $1 
        AND (e.organizer_id = $2 OR (eom.user_id = $2 AND eom.role IN ('owner', 'manager')))
      `, [sessionId, userId]);

      if (permissionCheck.rows.length === 0) {
        throw new Error('Permission denied');
      }

      const allowedFields = [
        'title', 'description', 'start_time', 'end_time',
        'min_tickets_per_order', 'max_tickets_per_order', 'sort_order'
      ];

      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          fieldsToUpdate.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fieldsToUpdate.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(sessionId);

      const updateQuery = `
        UPDATE event_sessions 
        SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update ticket type
   * @param {String} ticketTypeId - Ticket type ID
   * @param {Object} updateData - Update data
   * @param {String} userId - User ID for permission check
   * @returns {Object} Updated ticket type
   */
  static async updateTicketType(ticketTypeId, updateData, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check permission
      // const permissionCheck = await client.query(`
      //   SELECT tt.id 
      //   FROM ticket_types tt
      //   JOIN events e ON tt.event_id = e.id
      //   LEFT JOIN event_organizer_members eom ON e.id = eom.event_id
      //   WHERE tt.id = $1 
      //   AND (e.organizer_id = $2 OR (eom.user_id = $2 AND eom.role IN ('owner', 'manager')))
      // `, [ticketTypeId, userId]);

      // if (permissionCheck.rows.length === 0) {
      //   throw new Error('Permission denied');
      // }

       // Get current ticket type data
      const currentQuery = `
        SELECT tt.*, e.organizer_id
        FROM ticket_types tt
        JOIN events e ON tt.event_id = e.id
        LEFT JOIN event_organizer_members eom ON e.id = eom.event_id
        WHERE tt.id = $1 
        AND (e.organizer_id = $2 OR (eom.user_id = $2 AND eom.role IN ('owner', 'manager')))
        FOR UPDATE OF tt
      `;
      
      const currentResult = await client.query(currentQuery, [ticketTypeId, userId]);
      
      if (currentResult.rows.length === 0) {
        throw new Error('Permission denied');
      }
      
      const currentTicket = currentResult.rows[0];
      
      // ✅ Validate updates
      if (updateData.price !== undefined && updateData.price < 0) {
        throw new Error('Price cannot be negative');
      }

      if (currentTicket.sold_quantity > 0) {
        const restrictedFields = ['sale_start_time', 'sale_end_time', 'price'];
        const attemptingRestricted = restrictedFields.filter(field => 
          updateData[field] !== undefined && 
          String(updateData[field]) !== String(currentTicket[field])
        );
        
        if (attemptingRestricted.length > 0) {
          throw new Error(
            `Cannot change ${attemptingRestricted.join(', ')} after tickets have been sold. ` +
            `Current sold: ${currentTicket.sold_quantity} tickets. ` +
            `Please contact support if you need to make changes.`
          );
        }
      }
            
      if (updateData.total_quantity !== undefined) {
        if (updateData.total_quantity < currentTicket.sold_quantity) {
          throw new Error(
            `Total quantity cannot be less than sold quantity (${currentTicket.sold_quantity})`
          );
        }
      }
      
      if (updateData.sale_start_time && updateData.sale_end_time) {
        if (new Date(updateData.sale_start_time) >= new Date(updateData.sale_end_time)) {
          throw new Error('Sale start time must be before sale end time');
        }
      }

      const allowedFields = [
        'name', 'description', 'price', 'total_quantity',
        'min_quantity_per_order', 'max_quantity_per_order',
        'sale_start_time', 'sale_end_time', 'premium_early_access_minutes', 'sort_order'
      ];

      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          fieldsToUpdate.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fieldsToUpdate.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(ticketTypeId);

      const updateQuery = `
        UPDATE ticket_types 
        SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete session (soft delete)
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID for permission check
   * @returns {Boolean} Success status
   */
  static async deleteSession(sessionId, userId) {
    const client = await pool.connect();
    try {
      // Soft delete session and related ticket types
      await client.query('BEGIN');

      // Check permission and ensure no tickets sold
      const checkQuery = `
        SELECT es.id, COUNT(t.id) as ticket_count
        FROM event_sessions es
        JOIN events e ON es.event_id = e.id
        LEFT JOIN event_organizer_members eom ON e.id = eom.event_id
        LEFT JOIN ticket_types tt ON es.id = tt.session_id
        LEFT JOIN tickets t ON tt.id = t.ticket_type_id
        WHERE es.id = $1 
        AND (e.organizer_id = $2 OR (eom.user_id = $2 AND eom.role IN ('owner', 'manager')))
        GROUP BY es.id
        FOR UPDATE
      `;

      const checkResult = await client.query(checkQuery, [sessionId, userId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Session not found or permission denied');
      }

      if (parseInt(checkResult.rows[0].ticket_count) > 0) {
        throw new Error('Cannot delete session with sold tickets');
      }

      await client.query(
        'UPDATE ticket_types SET is_active = false, updated_at = NOW() WHERE session_id = $1',
        [sessionId]
      );

      await client.query(
        'UPDATE event_sessions SET is_active = false, updated_at = NOW() WHERE id = $1',
        [sessionId]
      );

      await client.query('COMMIT');

      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete ticket type (soft delete)
   * @param {String} ticketTypeId - Ticket type ID
   * @param {String} userId - User ID for permission check
   * @returns {Boolean} Success status
   */
  static async deleteTicketType(ticketTypeId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check permission and ensure no tickets sold
      const checkQuery = `
        SELECT tt.id, tt.sold_quantity
        FROM ticket_types tt
        JOIN events e ON tt.event_id = e.id
        LEFT JOIN event_organizer_members eom ON e.id = eom.event_id
        WHERE tt.id = $1 
        AND (e.organizer_id = $2 OR (eom.user_id = $2 AND eom.role IN ('owner', 'manager')))
        FOR UPDATE
      `;

      const checkResult = await client.query(checkQuery, [ticketTypeId, userId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Ticket type not found or permission denied');
      }

      if (parseInt(checkResult.rows[0].sold_quantity) > 0) {
        throw new Error('Cannot delete ticket type with sold tickets');
      }

      // Soft delete
      await client.query(
        'UPDATE ticket_types SET is_active = false, updated_at = NOW() WHERE id = $1',
        [ticketTypeId]
      );

      await client.query('COMMIT');
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = SessionTicketModel;