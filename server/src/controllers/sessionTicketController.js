// src/controllers/sessionTicketController.js
const SessionTicketModel = require('../models/sessionTicketModel');
const { createResponse } = require('../utils/helpers');
 const pool = require('../config/database');

class SessionTicketController {
  /**
   * Create event session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createSession(req, res) {
    try {
      const { eventId } = req.params;
      const sessionData = {
        ...req.body,
        created_by: req.user.id
      };

      console.log(`🎪 Creating session for event: ${eventId}`);

      const session = await SessionTicketModel.createSession(eventId, sessionData);

      const response = createResponse(
        true,
        'Event session created successfully',
        { session }
      );

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Create session error:', error.message);

      let statusCode = 500;
      let message = 'Failed to create session';

      if (error.message === 'Event not found or access denied') {
        statusCode = 403;
        message = 'Event not found or you do not have permission to create sessions';
      } else if (error.message === 'Start time must be before end time') {
        statusCode = 400;
        message = 'Start time must be before end time';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get event sessions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getEventSessions(req, res) {
    try {
      const { eventId } = req.params;

      console.log(`📅 Getting sessions for event: ${eventId}`);

      const sessions = await SessionTicketModel.getEventSessions(eventId);

      const response = createResponse(
        true,
        `Found ${sessions.length} sessions`,
        { sessions }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get sessions error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve sessions'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Update session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      console.log(`📝 Updating session: ${sessionId}`);

      const session = await SessionTicketModel.updateSession(sessionId, updateData, userId);

      const response = createResponse(
        true,
        'Session updated successfully',
        { session }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Update session error:', error.message);

      let statusCode = 500;
      let message = 'Failed to update session';

      if (error.message === 'Permission denied') {
        statusCode = 403;
        message = 'You do not have permission to update this session';
      } else if (error.message === 'No valid fields to update') {
        statusCode = 400;
        message = 'No valid fields provided for update';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Delete session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      console.log(`🗑️ Deleting session: ${sessionId}`);

      await SessionTicketModel.deleteSession(sessionId, userId);

      const response = createResponse(
        true,
        'Session deleted successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Delete session error:', error.message);

      let statusCode = 500;
      let message = 'Failed to delete session';

      if (error.message === 'Session not found or permission denied') {
        statusCode = 403;
        message = 'Session not found or permission denied';
      } else if (error.message === 'Cannot delete session with sold tickets') {
        statusCode = 409;
        message = 'Cannot delete session with sold tickets';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Create ticket type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createTicketType(req, res) {
    try {
      const { sessionId } = req.params;
      const ticketData = req.body;

      console.log(`🎫 Creating ticket type for session: ${sessionId}`);

      const ticketType = await SessionTicketModel.createTicketType(sessionId, ticketData);

      const response = createResponse(
        true,
        'Ticket type created successfully',
        { ticketType }
      );

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Create ticket type error:', error.message);

      let statusCode = 500;
      let message = 'Failed to create ticket type';

      if (error.message === 'Session not found') {
        statusCode = 404;
        message = 'Session not found';
      } else if (error.message.includes('Price cannot be negative')) {
        statusCode = 400;
        message = 'Price cannot be negative';
      } else if (error.message.includes('Total quantity must be at least 1')) {
        statusCode = 400;
        message = 'Total quantity must be at least 1';
      } else if (error.message.includes('Sale start time must be before')) {
        statusCode = 400;
        message = 'Sale start time must be before sale end time';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get session ticket types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getSessionTicketTypes(req, res) {
    try {
      const { sessionId } = req.params;

      console.log(`🎫 Getting ticket types for session: ${sessionId}`);

      const ticketTypes = await SessionTicketModel.getSessionTicketTypes(sessionId);

      const response = createResponse(
        true,
        `Found ${ticketTypes.length} ticket types`,
        { ticket_types: ticketTypes }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get ticket types error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve ticket types'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Update ticket type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateTicketType(req, res) {
    try {
      const { ticketTypeId } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      console.log(`📝 Updating ticket type: ${ticketTypeId}`);

      const ticketType = await SessionTicketModel.updateTicketType(ticketTypeId, updateData, userId);

      const response = createResponse(
        true,
        'Ticket type updated successfully',
        { ticketType }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Update ticket type error:', error.message);

      let statusCode = 500;
      let message = 'Failed to update ticket type';

      if (error.message === 'Permission denied') {
        statusCode = 403;
        message = 'You do not have permission to update this ticket type';
      } else if (error.message === 'No valid fields to update') {
        statusCode = 400;
        message = 'No valid fields provided for update';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Delete ticket type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteTicketType(req, res) {
    try {
      const { ticketTypeId } = req.params;
      const userId = req.user.id;

      console.log(`🗑️ Deleting ticket type: ${ticketTypeId}`);

      await SessionTicketModel.deleteTicketType(ticketTypeId, userId);

      const response = createResponse(
        true,
        'Ticket type deleted successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Delete ticket type error:', error.message);

      let statusCode = 500;
      let message = 'Failed to delete ticket type';

      if (error.message === 'Ticket type not found or permission denied') {
        statusCode = 403;
        message = 'Ticket type not found or permission denied';
      } else if (error.message === 'Cannot delete ticket type with sold tickets') {
        statusCode = 409;
        message = 'Cannot delete ticket type with sold tickets';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get ticket type by ID
   * @param {String} ticketTypeId - Ticket type ID
   * @returns {Object} Ticket type
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
   * Get event with sessions and ticket types (for purchase)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getEventWithTickets(req, res) {
    try {
      const { eventId } = req.params;

      console.log(`🎪 Getting event with ticket info: ${eventId}`);

      // Get event basic info
      const EventModel = require('../models/eventModel');
      const event = await EventModel.findById(eventId, req.user?.id);

      if (!event) {
        return res.status(404).json(
          createResponse(false, 'Event not found')
        );
      }

      // Get sessions with ticket types
      const sessions = await SessionTicketModel.getEventSessions(eventId);
      
      // Get ticket types for each session
      for (let session of sessions) {
        session.ticketTypes = await SessionTicketModel.getSessionTicketTypes(session.id);
      }

      const response = createResponse(
        true,
        'Event ticket information retrieved successfully',
        {
          event,
          sessions
        }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get event with tickets error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve event ticket information'
      );
      
      res.status(500).json(response);
    }
  }
}

module.exports = SessionTicketController;