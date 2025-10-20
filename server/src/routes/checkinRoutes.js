// src/routes/checkinRoutes.js
const express = require('express');
const CheckinController = require('../controllers/checkinController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All check-in routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/checkin/verify/:ticketCode
 * @desc    Verify ticket before check-in
 * @access  Private (Event Staff)
 */
router.get('/verify/:ticketCode',
  authorizeRoles(['organizer', 'admin']),
  CheckinController.verifyTicket
);

/**
 * @route   POST /api/checkin/:ticketCode
 * @desc    Check-in ticket
 * @access  Private (Event Staff)
 */
router.post('/:ticketCode',
  authorizeRoles(['organizer', 'admin']),
  CheckinController.checkinTicket
);

/**
 * @route   GET /api/checkin/event/:eventId/stats
 * @desc    Get check-in statistics for event
 * @access  Private (Event Organizer)
 */
router.get('/event/:eventId/stats',
  authorizeRoles(['organizer', 'admin']),
  CheckinController.getCheckinStats
);

/**
 * @route   GET /api/checkin/event/:eventId/recent
 * @desc    Get recent check-ins for event
 * @access  Private (Event Organizer)
 */
router.get('/event/:eventId/recent',
  authorizeRoles(['organizer', 'admin']),
  CheckinController.getRecentCheckins
);

/**
 * @route   GET /api/checkin/event/:eventId/search
 * @desc    Search tickets for event
 * @access  Private (Event Organizer)
 */
router.get('/event/:eventId/search',
  authorizeRoles(['organizer', 'admin']),
  CheckinController.searchTickets
);

/**
 * @route   DELETE /api/checkin/:ticketCode
 * @desc    Undo check-in (Admin/Owner only)
 * @access  Private (Event Owner/Admin)
 */
router.delete('/:ticketCode',
  authorizeRoles(['organizer', 'admin']),
  CheckinController.undoCheckin
);

module.exports = router;