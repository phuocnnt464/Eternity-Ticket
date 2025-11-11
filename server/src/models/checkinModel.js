// src/models/checkinModel.js
const pool = require('../config/database');
const { verifySecureQRData } = require('../utils/qrCodeGenerator');

class CheckinModel {
  /**
   * Verify ticket by code or QR data
   * @param {String} ticketCode - Ticket code
   * @param {String} eventId - Event ID (optional for additional verification)
   * @returns {Object|null} Ticket details if valid
   */
  static async verifyTicket(ticketCode, eventId = null) {
    try {
      let query = `
        SELECT 
          t.*,
          tt.name as ticket_type_name,
          tt.price as ticket_price,
          e.title as event_title,
          e.venue_name,
          es.title as session_title,
          es.start_time as session_start_time,
          es.end_time as session_end_time,
          o.order_number,
          o.status as order_status,
          o.paid_at
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        JOIN events e ON t.event_id = e.id
        JOIN event_sessions es ON t.session_id = es.id
        JOIN orders o ON t.order_id = o.id
        WHERE t.ticket_code = $1
      `;

      let params = [ticketCode];

      if (eventId) {
        query += ' AND t.event_id = $2';
        params.push(eventId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];

    } catch (error) {
      throw new Error(`Failed to verify ticket: ${error.message}`);
    }
  }

  /**
   * Check-in ticket
   * @param {String} ticketCode - Ticket code
   * @param {String} checkedInBy - User ID of person checking in the ticket
   * @param {String} location - Check-in location (optional)
   * @returns {Object} Check-in result
   */
  static async checkinTicket(ticketCode, checkedInBy, location = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get ticket details
      // const ticket = await this.verifyTicket(ticketCode);

      // if (!ticket) {
      //   throw new Error('Ticket not found');
      // }

      const verifyQuery = `
        SELECT t.*, tt.name as ticket_type_name, 
              e.title as event_title, es.title as session_title,
              o.status as order_status
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        JOIN events e ON t.event_id = e.id
        JOIN event_sessions es ON t.session_id = es.id
        JOIN orders o ON t.order_id = o.id
        WHERE t.ticket_code = $1
        FOR UPDATE  -- Khóa row cho đến khi COMMIT
      `;
      
      const result = await client.query(verifyQuery, [ticketCode]);
      
      if (result.rows.length === 0) {
        throw new Error('Ticket not found');
      }
      
      const ticket = result.rows[0];

      // Verify ticket is valid for check-in
      if (ticket.order_status !== 'paid') {
        throw new Error('Ticket order is not paid. Cannot check in.');
      }

      if (ticket.status === 'cancelled') {
        throw new Error('Ticket has been cancelled');
      }

      if (ticket.status === 'refunded') {
        throw new Error('Ticket has been refunded');
      }

      if (ticket.is_checked_in) {
        // Already checked in - return check-in details
        return {
          success: false,
          message: 'Ticket already checked in',
          ticket: {
            ticket_code: ticket.ticket_code,
            event_title: ticket.event_title,
            session_title: ticket.session_title,
            checked_in_at: ticket.checked_in_at,
            checked_in_by: ticket.checked_in_by
          },
          already_checked_in: true
        };
      }

      // Verify check-in user has permission for this event
      const permissionCheck = await client.query(`
        SELECT eom.role
        FROM event_organizer_members eom
        WHERE eom.event_id = $1 AND eom.user_id = $2 AND eom.is_active = true
      `, [ticket.event_id, checkedInBy]);

      if (permissionCheck.rows.length === 0) {
        // Check if user is event owner
        const ownerCheck = await client.query(`
          SELECT id FROM events WHERE id = $1 AND organizer_id = $2
        `, [ticket.event_id, checkedInBy]);

        if (ownerCheck.rows.length === 0) {
          throw new Error('You do not have permission to check in tickets for this event');
        }
      }

      // Perform check-in
      const checkinQuery = `
        UPDATE tickets
        SET is_checked_in = true,
            checked_in_at = NOW(),
            checked_in_by = $1,
            check_in_location = $2,
            updated_at = NOW()
        WHERE ticket_code = $3
        RETURNING *
      `;

      const checkinResult = await client.query(checkinQuery, [
        checkedInBy,
        location,
        ticketCode
      ]);

      await client.query('COMMIT');

      console.log(`Ticket checked in: ${ticketCode} at ${new Date().toISOString()}`);

      return {
        success: true,
        message: 'Check-in successful',
        ticket: {
          ...checkinResult.rows[0],
          event_title: ticket.event_title,
          session_title: ticket.session_title,
          ticket_type_name: ticket.ticket_type_name,
          holder_name: ticket.holder_name
        },
        already_checked_in: false
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get check-in statistics for event
   * @param {String} eventId - Event ID
   * @param {String} sessionId - Session ID (optional)
   * @returns {Object} Check-in statistics
   */
  static async getCheckinStats(eventId, sessionId = null) {
    try {
      let query = `
        SELECT 
          COUNT(t.id) as total_tickets,
          COUNT(CASE WHEN t.is_checked_in THEN 1 END) as checked_in_tickets,
          COUNT(CASE WHEN NOT t.is_checked_in AND o.status = 'paid' THEN 1 END) as pending_checkin,
          COUNT(DISTINCT t.user_id) as unique_attendees,
          MIN(t.checked_in_at) as first_checkin,
          MAX(t.checked_in_at) as last_checkin
        FROM tickets t
        JOIN orders o ON t.order_id = o.id
        WHERE t.event_id = $1
      `;

      let params = [eventId];

      if (sessionId) {
        query += ' AND t.session_id = $2';
        params.push(sessionId);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          total_tickets: 0,
          checked_in_tickets: 0,
          pending_checkin: 0,
          unique_attendees: 0,
          checkin_rate: 0
        };
      }

      const stats = result.rows[0];

      // Get breakdown by ticket type
      let ticketTypeQuery = `
        SELECT 
          tt.name as ticket_type_name,
          COUNT(t.id) as total,
          COUNT(CASE WHEN t.is_checked_in THEN 1 END) as checked_in
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        JOIN orders o ON t.order_id = o.id
        WHERE t.event_id = $1 AND o.status = 'paid'
      `;

      if (sessionId) {
        ticketTypeQuery += ' AND t.session_id = $2';
      }

      ticketTypeQuery += ' GROUP BY tt.id, tt.name ORDER BY tt.name';

      const ticketTypeResult = await pool.query(ticketTypeQuery, params);

      const totalTickets = parseInt(stats.total_tickets) || 0;
      const checkedInTickets = parseInt(stats.checked_in_tickets) || 0;
      const checkinRate = totalTickets > 0 ? (checkedInTickets / totalTickets * 100).toFixed(2) : 0;

      return {
        total_tickets: totalTickets,
        checked_in_tickets: checkedInTickets,
        pending_checkin: parseInt(stats.pending_checkin) || 0,
        unique_attendees: parseInt(stats.unique_attendees) || 0,
        checkin_rate: parseFloat(checkinRate),
        first_checkin: stats.first_checkin,
        last_checkin: stats.last_checkin,
        by_ticket_type: ticketTypeResult.rows.map(row => ({
          ticket_type_name: row.ticket_type_name,
          total: parseInt(row.total),
          checked_in: parseInt(row.checked_in),
          rate: row.total > 0 ? ((row.checked_in / row.total) * 100).toFixed(2) : 0
        }))
      };

    } catch (error) {
      throw new Error(`Failed to get check-in stats: ${error.message}`);
    }
  }

  /**
   * Get recent check-ins for event
   * @param {String} eventId - Event ID
   * @param {Number} limit - Number of records to return
   * @returns {Array} Recent check-ins
   */
  static async getRecentCheckins(eventId, limit = 50) {
    try {
      const query = `
        SELECT 
          t.ticket_code,
          t.checked_in_at,
          t.holder_name,
          tt.name as ticket_type_name,
          u.first_name || ' ' || u.last_name as checked_in_by_name,
          t.check_in_location
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        JOIN users u ON t.checked_in_by = u.id
        WHERE t.event_id = $1 AND t.is_checked_in = true
        ORDER BY t.checked_in_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [eventId, limit]);
      return result.rows;

    } catch (error) {
      throw new Error(`Failed to get recent check-ins: ${error.message}`);
    }
  }

  /**
   * Search tickets for check-in
   * @param {String} eventId - Event ID
   * @param {String} searchTerm - Search term (ticket code, holder name, email)
   * @returns {Array} Matching tickets
   */
  static async searchTickets(eventId, searchTerm) {
    try {
      const query = `
        SELECT 
          t.id,
          t.ticket_code,
          t.holder_name,
          t.holder_email,
          t.is_checked_in,
          t.checked_in_at,
          tt.name as ticket_type_name,
          es.title as session_title,
          es.start_time as session_start_time,
          o.order_number,
          o.status as order_status
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        JOIN event_sessions es ON t.session_id = es.id
        JOIN orders o ON t.order_id = o.id
        WHERE t.event_id = $1
        AND (
          t.ticket_code ILIKE $2
          OR t.holder_name ILIKE $2
          OR t.holder_email ILIKE $2
          OR o.order_number ILIKE $2
        )
        AND o.status = 'paid'
        ORDER BY t.created_at DESC
        LIMIT 20
      `;

      const result = await pool.query(query, [eventId, `%${searchTerm}%`]);
      return result.rows;

    } catch (error) {
      throw new Error(`Failed to search tickets: ${error.message}`);
    }
  }

  /**
   * Undo check-in (admin only)
   * @param {String} ticketCode - Ticket code
   * @param {String} undoneBy - User ID of person undoing check-in
   * @returns {Boolean} Success status
   */
  static async undoCheckin(ticketCode, undoneBy) {
    try {
      // Verify ticket exists and is checked in
      const ticket = await this.verifyTicket(ticketCode);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (!ticket.is_checked_in) {
        throw new Error('Ticket is not checked in');
      }

      // Verify user has permission (owner or admin)
      const permissionCheck = await pool.query(`
        SELECT e.organizer_id, u.role
        FROM events e
        JOIN users u ON u.id = $1
        WHERE e.id = $2
      `, [undoneBy, ticket.event_id]);

      if (permissionCheck.rows.length === 0) {
        throw new Error('Permission denied');
      }

      const { organizer_id, role } = permissionCheck.rows[0];

      if (undoneBy !== organizer_id && role !== 'admin' && role !== 'sub_admin') {
        throw new Error('Only event owner or admin can undo check-ins');
      }

      // Undo check-in
      await pool.query(`
        UPDATE tickets
        SET is_checked_in = false,
            checked_in_at = NULL,
            checked_in_by = NULL,
            check_in_location = NULL,
            updated_at = NOW()
        WHERE ticket_code = $1
      `, [ticketCode]);

      console.log(`Check-in undone for ticket: ${ticketCode} by user: ${undoneBy}`);
      return true;

    } catch (error) {
      throw error;
    }
  }

  static async verifyTicketFromQR(qrToken, eventId = null) {
    try {
      // Decode JWT QR
      const qrData = verifySecureQRData(qrToken);
      
      // Verify bằng ticket_code
      const ticket = await this.verifyTicket(qrData.ticket_code, eventId);
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      // Additional verification
      if (ticket.event_id !== qrData.event_id) {
        throw new Error('QR code does not match event');
      }
      
      return ticket;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CheckinModel;