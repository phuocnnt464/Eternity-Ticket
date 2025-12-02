const CheckinModel = require('../models/checkinModel');
const { createResponse } = require('../utils/helpers');

class CheckinController {
  static async verifyTicket(req, res) {
    try {
      const { ticketCode } = req.params;
      const { eventId } = req.query;

      // console.log(`Verifying ticket: ${ticketCode}`);

      const ticket = await CheckinModel.verifyTicket(ticketCode, eventId);

      if (!ticket) {
        return res.status(404).json(
          createResponse(false, 'Ticket not found')
        );
      }

      let validationIssues = [];

      if (ticket.order_status !== 'paid') {
        validationIssues.push('Order not paid');
      }

      if (ticket.status === 'cancelled') {
        validationIssues.push('Ticket cancelled');
      }

      if (ticket.status === 'refunded') {
        validationIssues.push('Ticket refunded');
      }

      if (ticket.is_checked_in) {
        validationIssues.push('Already checked in');
      }

      const isValid = validationIssues.length === 0;

      const response = createResponse(
        true,
        isValid ? 'Ticket is valid' : 'Ticket has issues',
        {
          ticket: {
            ticket_code: ticket.ticket_code,
            holder_name: ticket.holder_name,
            holder_email: ticket.holder_email,
            event_title: ticket.event_title,
            session_title: ticket.session_title,
            session_start_time: ticket.session_start_time,
            ticket_type_name: ticket.ticket_type_name,
            is_checked_in: ticket.is_checked_in,
            checked_in_at: ticket.checked_in_at,
            order_status: ticket.order_status
          },
          is_valid: isValid,
          validation_issues: validationIssues
        }
      );

      res.json(response);

    } catch (error) {
      console.error('Verify ticket error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to verify ticket'
      );
      
      res.status(500).json(response);
    }
  }

  static async checkinTicket(req, res) {
    try {
      const { ticketCode } = req.params;
      const checkedInBy = req.user.id;
      const { location } = req.body || {};

      // console.log(`Checking in ticket: ${ticketCode} by user: ${checkedInBy}`);

      const result = await CheckinModel.checkinTicket(ticketCode, checkedInBy, location);

      if (!result.success) {
        return res.status(409).json(
          createResponse(false, result.message, {
            ticket: result.ticket,
            already_checked_in: result.already_checked_in
          })
        );
      }

      const response = createResponse(
        true,
        'Check-in successful',
        {
          ticket: {
            ticket_code: result.ticket.ticket_code,
            holder_name: result.ticket.holder_name,
            event_title: result.ticket.event_title,
            session_title: result.ticket.session_title,
            ticket_type_name: result.ticket.ticket_type_name,
            checked_in_at: result.ticket.checked_in_at,
            check_in_location: result.ticket.check_in_location
          }
        }
      );

      res.json(response);

    } catch (error) {
      console.error('Check-in error:', error.message);

      let statusCode = 500;
      let message = 'Check-in failed';

      if (error.message === 'Ticket not found') {
        statusCode = 404;
        message = 'Ticket not found';
      } else if (error.message.includes('Already checked in')) {
        statusCode = 409;
        message = error.message;
      } else if (error.message.includes('not paid')) {
        statusCode = 400;
        message = 'Ticket order is not paid';
      } else if (error.message.includes('cancelled')) {
        statusCode = 400;
        message = 'Ticket has been cancelled';
      } else if (error.message.includes('permission')) {
        statusCode = 403;
        message = 'You do not have permission to check in tickets for this event';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  static async getCheckinStats(req, res) {
    try {
      const { eventId } = req.params;
      const { sessionId } = req.query;

      console.log(`Getting check-in stats for event: ${eventId}`);

      const stats = await CheckinModel.getCheckinStats(eventId, sessionId);

      const response = createResponse(
        true,
        'Check-in statistics retrieved successfully',
        { stats }
      );

      res.json(response);

    } catch (error) {
      console.error('Get check-in stats error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve check-in statistics'
      );
      
      res.status(500).json(response);
    }
  }

  static async getRecentCheckins(req, res) {
    try {
      const { eventId } = req.params;
      const { limit = 50 } = req.query;

      // console.log(`Getting recent check-ins for event: ${eventId}`);

      const checkins = await CheckinModel.getRecentCheckins(eventId, parseInt(limit));

      const response = createResponse(
        true,
        `Found ${checkins.length} recent check-ins`,
        { checkins }
      );

      res.json(response);

    } catch (error) {
      console.error('Get recent check-ins error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve recent check-ins'
      );
      
      res.status(500).json(response);
    }
  }

  static async searchTickets(req, res) {
    try {
      const { eventId } = req.params;
      const { q: searchTerm } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json(
          createResponse(false, 'Search term must be at least 2 characters')
        );
      }

      // console.log(`Searching tickets for event: ${eventId}, term: ${searchTerm}`);

      const tickets = await CheckinModel.searchTickets(eventId, searchTerm.trim());

      const response = createResponse(
        true,
        `Found ${tickets.length} matching tickets`,
        { tickets }
      );

      res.json(response);

    } catch (error) {
      console.error('Search tickets error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to search tickets'
      );
      
      res.status(500).json(response);
    }
  }

  static async undoCheckin(req, res) {
    try {
      const { ticketCode } = req.params;
      const undoneBy = req.user.id;

      // console.log(`Undoing check-in for ticket: ${ticketCode}`);

      await CheckinModel.undoCheckin(ticketCode, undoneBy);

      const response = createResponse(
        true,
        'Check-in undone successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('Undo check-in error:', error.message);

      let statusCode = 500;
      let message = 'Failed to undo check-in';

      if (error.message === 'Ticket not found') {
        statusCode = 404;
        message = 'Ticket not found';
      } else if (error.message === 'Ticket is not checked in') {
        statusCode = 400;
        message = 'Ticket is not checked in';
      } else if (error.message.includes('Permission denied')) {
        statusCode = 403;
        message = 'Only event owner or admin can undo check-ins';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }
}

module.exports = CheckinController;