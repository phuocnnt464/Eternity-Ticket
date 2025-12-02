const QueueController = require('../controllers/queueController');
const { createResponse } = require('../utils/helpers');

const checkQueueAccess = async (req, res, next) => {
  try {
    const { session_id } = req.body;
    const userId = req.user.id;

    if (!session_id) {
      return res.status(400).json(
        createResponse(false, 'Session ID is required')
      );
    }

    const canPurchase = await QueueController.checkCanPurchase(userId, session_id);

    if (!canPurchase) {
      return res.status(403).json(
        createResponse(
          false,
          'You must join the waiting room first',
          {
            action_required: 'join_queue',
            waiting_room_enabled: true
          }
        )
      );
    }

    next();

  } catch (error) {
    console.error('Queue access check error:', error);
    next();
  }
};

const validateQueueRequest = (req, res, next) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json(
      createResponse(false, 'Session ID is required')
    );
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(session_id)) {
    return res.status(400).json(
      createResponse(false, 'Invalid session ID format')
    );
  }

  next();
};

module.exports = {
  checkQueueAccess,
  validateQueueRequest
};