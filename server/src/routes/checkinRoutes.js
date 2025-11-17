// src/routes/checkinRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const CheckinController = require('../controllers/checkinController');
const { 
  authenticateToken, 
  authorizeRoles, 
  authorizeEventOrganizer,
  requireEventRole } = require('../middleware/authMiddleware');

const { createResponse } = require('../utils/helpers');  
const pool = require('../config/database');

const router = express.Router();

const checkinLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // max 10 checkin attempts per minute per IP
  message: {
    success: false,
    error: { message: 'Too many check-in attempts. Please wait.' }
  }
});

/**
 * Helper middleware: Lấy eventId từ ticketCode nếu cần
 * Để authorizeEventOrganizer hoạt động, cần eventId trong req.params hoặc req.body
 */
const extractEventIdFromTicket = async (req, res, next) => {
  try {
    // Nếu đã có eventId trong params hoặc query, skip
    if (req.params.eventId || (req.query && req.query.eventId) || (req.body && req.body.eventId)) {
      // Đưa eventId vào params để authorizeEventOrganizer dùng
      if (!req.params.eventId) {
        req.params.eventId = (req.query && req.query.eventId) || (req.body && req.body.eventId);
      }
      return next();
    }
    
    // Nếu có ticketCode, lấy eventId từ ticket
    const { ticketCode } = req.params;
    
    if (ticketCode) {
      const result = await pool.query(
        'SELECT event_id FROM tickets WHERE ticket_code = $1 FOR UPDATE',
        [ticketCode]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Ticket not found')
        );
      }
      
      // Inject eventId vào params để middleware tiếp theo dùng
      req.params.eventId = result.rows[0].event_id;
    }
    
    next();
  } catch (error) {
    console.error('❌ Extract eventId error:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to verify ticket')
    );
  }
};

/**
 * Middleware tổng hợp cho undo checkin
 * Chỉ owner và admin được undo
 */
const canUndoCheckin = [
  extractEventIdFromTicket,
  authorizeEventOrganizer(),
  (req, res, next) => {
    // Admin luôn được phép
    if (req.isAdmin) {
      return next();
    }

    // Chỉ owner mới được undo
    if (!req.eventAccess || !req.eventAccess.isOwner) {
      return res.status(403).json(
        createResponse(false, 'Only event owner or admin can undo check-ins')
      );
    }
    
    next();
  }
];

// All check-in routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/checkin/verify/:ticketCode
 * @desc    Verify ticket before check-in
 * @access  Private (Event Staff)
 */
router.get('/verify/:ticketCode',
  extractEventIdFromTicket,
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.verifyTicket
);

/**
 * @route   POST /api/checkin/:ticketCode
 * @desc    Check-in ticket
 * @access  Private (Event Staff)
 */
router.post('/:ticketCode',
  checkinLimiter,
  extractEventIdFromTicket,
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.checkinTicket
);

/**
 * @route   GET /api/checkin/event/:eventId/stats
 * @desc    Get check-in statistics for event
 * @access  Private (Event Organizer)
 */
router.get('/event/:eventId/stats',
  authorizeEventOrganizer(),
  requireEventRole('manager'),
  CheckinController.getCheckinStats
);

/**
 * @route   GET /api/checkin/event/:eventId/recent
 * @desc    Get recent check-ins for event
 * @access  Private (Event Organizer)
 */
router.get('/event/:eventId/recent',
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.getRecentCheckins
);

/**
 * @route   GET /api/checkin/event/:eventId/search
 * @desc    Search tickets for event
 * @access  Private (Event Organizer)
 */
router.get('/event/:eventId/search',
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.searchTickets
);

/**
 * @route   DELETE /api/checkin/:ticketCode
 * @desc    Undo check-in (Admin/Owner only)
 * @access  Private (Event Owner/Admin)
 */
router.delete('/:ticketCode/undo',
  ...canUndoCheckin,
  CheckinController.undoCheckin
);

module.exports = router;