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
  windowMs: 1 * 60 * 1000, 
  max: 1000,
  message: {
    success: false,
    error: { message: 'Too many check-in attempts. Please wait.' }
  }
});

const extractEventIdFromTicket = async (req, res, next) => {
  try {
    if (req.params.eventId || (req.query && req.query.eventId) || (req.body && req.body.eventId)) {
      if (!req.params.eventId) {
        req.params.eventId = (req.query && req.query.eventId) || (req.body && req.body.eventId);
      }
      return next();
    }

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

const canUndoCheckin = [
  extractEventIdFromTicket,
  authorizeEventOrganizer(),
  (req, res, next) => {
    if (req.isAdmin) {
      return next();
    }

    if (!req.eventAccess) {
      return res.status(403).json(
        createResponse(false, 'Event access required')
      );
    }

    const isOwner = req.eventAccess.isOwner;
    const isManager = req.eventAccess.memberRole === 'manager';

    if (!isOwner && !isManager) {
      return res.status(403).json(
        createResponse(false, 'Only event owner, manager, or admin can undo check-ins')
      );
    }
    
    next();
  }
];

router.use(authenticateToken);

router.get('/verify/:ticketCode',
  extractEventIdFromTicket,
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.verifyTicket
);

router.post('/:ticketCode',
  checkinLimiter,
  extractEventIdFromTicket,
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.checkinTicket
);

router.get('/event/:eventId/stats',
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.getCheckinStats
);

router.get('/event/:eventId/recent',
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.getRecentCheckins
);

router.get('/event/:eventId/search',
  authorizeEventOrganizer(),
  requireEventRole('manager','checkin_staff'),
  CheckinController.searchTickets
);

router.delete('/:ticketCode/undo',
  ...canUndoCheckin,
  CheckinController.undoCheckin
);

module.exports = router;