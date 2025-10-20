// src/middleware/authMiddleware.js
const { verifyToken, createResponse } = require('../utils/helpers');
const UserModel = require('../models/userModel');

/**
 * JWT Authentication Middleware
 * Validates JWT token and adds user info to request object
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json(
        createResponse(false, 'Access token is required. Please provide a valid token.')
      );
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get fresh user data from database
    const user = await UserModel.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json(
        createResponse(false, 'User not found. Token may be invalid.')
      );
    }

    if (!user.is_active) {
      return res.status(401).json(
        createResponse(false, 'Account has been deactivated. Please contact support.')
      );
    }

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      return res.status(423).json(
        createResponse(false, 'Account is temporarily locked. Please try again later.')
      );
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      is_email_verified: user.is_email_verified,
      membership_tier: user.membership_tier || 'basic'
    };

    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);

    let message = 'Invalid token. Please log in again.';
    let statusCode = 401;

    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired. Please log in again.';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token format. Please provide a valid token.';
    } else if (error.name === 'NotBeforeError') {
      message = 'Token is not active yet.';
    }

    return res.status(statusCode).json(
      createResponse(false, message)
    );
  }
};

/**
 * Role-based authorization middleware
 * @param {Array|String} allowedRoles - Allowed roles for the endpoint
 */
// const authorizeRoles = (allowedRoles) => {
//   // Ensure allowedRoles is always an array
//   const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json(
//         createResponse(false, 'Authentication required')
//       );
//     }

//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json(
//         createResponse(false, `Access denied. Required roles: ${roles.join(', ')}`)
//       );
//     }

//     next();
//   };
// };
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, 'Authentication required')
      );
    }

    // Flatten array if nested
    const roles = allowedRoles.flat();

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        createResponse(
          false, 
          `Access denied. This action requires one of these roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Resource owner or admin authorization
 * @param {String} paramName - Name of the parameter containing resource owner ID
 * @example
 * router.put('/users/:userId', authenticateToken, authorizeOwnerOrAdmin('userId'), handler)
 */
const authorizeOwnerOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, 'Authentication required')
      );
    }

    const resourceOwnerId = req.params[paramName] || req.body[paramName];
    const isOwner = req.user.id === resourceOwnerId;
    const isAdmin = ['admin', 'sub_admin'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json(
        createResponse(false, 'Access denied. You can only access your own resources.')
      );
    }

    // Add flag to know if user is admin (useful in controllers)
    req.isAdmin = isAdmin;

    next();
  };
};

/**
 * Email verification middleware
 * Ensures user has verified their email
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(
      createResponse(false, 'Authentication required')
    );
  }

  if (!req.user.is_email_verified) {
    return res.status(403).json(
      createResponse(false, 'Email verification required. Please check your email and verify your account.')
    );
  }

  next();
};

/**
 * Membership tier middleware
 * @param {Array|String} requiredTiers - Required membership tiers
 * @example
 * router.get('/premium', authenticateToken, requireMembershipTier(['premium', 'advanced']), handler)
 */

// const requireMembershipTier = (requiredTiers) => {
//   const tiers = Array.isArray(requiredTiers) ? requiredTiers : [requiredTiers];
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json(
//         createResponse(false, 'Authentication required')
//       );
//     }

//     if (!tiers.includes(req.user.membership_tier)) {
//       return res.status(403).json(
//         createResponse(false, `Premium membership required. Required tiers: ${tiers.join(', ')}`)
//       );
//     }

//     next();
//   };
// };
const requireMembershipTier = (...requiredTiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, 'Authentication required')
      );
    }

    const tiers = requiredTiers.flat();

    if (!tiers.includes(req.user.membership_tier)) {
      return res.status(403).json(
        createResponse(
          false, 
          `This feature requires ${tiers.join(' or ')} membership. Please upgrade your account.`,
          {
            current_tier: req.user.membership_tier,
            required_tiers: tiers,
            upgrade_url: '/api/memberships/upgrade'
          }
        )
      );
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user info if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const user = await UserModel.findById(decoded.id);
      
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_email_verified: user.is_email_verified,
          membership_tier: user.membership_tier || 'basic'
        };
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Rate limiting for authenticated users
 * Higher limits for authenticated users
 */
// const authenticatedRateLimit = (req, res, next) => {
//   // This would integrate with express-rate-limit
//   // For now, just pass through
//   next();
// };

/**
 * Check if user is organizer of specific event
 * @param {String} eventIdParam - Parameter name for event ID
 */
const authorizeEventOrganizer = (eventIdParam = 'eventId') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, 'Authentication required')
      );
    }

    const eventId = req.params[eventIdParam] || req.body[eventIdParam];

    if (!eventId) {
      return res.status(400).json(
        createResponse(false, 'Event ID is required')
      );
    }

    try {
      // Check if user is admin or event organizer
      if (['admin', 'sub_admin'].includes(req.user.role)) {
        req.isAdmin = true;
        return next();
      }

      // Check if user is the event organizer or team member
      const pool = require('../config/database');
      const query = `
        SELECT e.organizer_id, eom.role as member_role
        FROM events e
        LEFT JOIN event_organizer_members eom 
          ON e.id = eom.event_id 
          AND eom.user_id = $1 
          AND eom.is_active = true
        WHERE e.id = $2
      `;
      
      const result = await pool.query(query, [req.user.id, eventId]);

      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Event not found')
        );
      }

      const event = result.rows[0];
      const isOwner = event.organizer_id === req.user.id;
      const isTeamMember = event.member_role !== null;

      if (!isOwner && !isTeamMember) {
        return res.status(403).json(
          createResponse(false, 'Access denied. You are not authorized to manage this event.')
        );
      }

      // Add event access info to request
      req.eventAccess = {
        isOwner,
        isTeamMember,
        memberRole: event.member_role
      };

      next();
    } catch (error) {
      console.error('Event authorization error:', error);
      return res.status(500).json(
        createResponse(false, 'Failed to verify event access')
      );
    }
  };
};

/**
 * Require specific event organizer role
 * @param {Array|String} allowedRoles - Allowed organizer roles (owner, manager, checkin_staff)
 */
const requireEventRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.eventAccess) {
      return res.status(403).json(
        createResponse(false, 'Event access verification required')
      );
    }

    const roles = allowedRoles.flat();

    // Owner always has access
    if (req.eventAccess.isOwner) {
      return next();
    }

    // Check team member role
    if (!req.eventAccess.isTeamMember || !roles.includes(req.eventAccess.memberRole)) {
      return res.status(403).json(
        createResponse(
          false,
          `Access denied. Required event roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Purchase cooldown middleware
 * Prevents rapid consecutive purchases
 */
const checkPurchaseCooldown = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(
      createResponse(false, 'Authentication required')
    );
  }

  try {
    const pool = require('../config/database');
    const query = `
      SELECT purchase_cooldown_until
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return next();
    }

    const cooldownUntil = result.rows[0].purchase_cooldown_until;

    if (cooldownUntil && new Date(cooldownUntil) > new Date()) {
      const secondsRemaining = Math.ceil((new Date(cooldownUntil) - new Date()) / 1000);
      
      return res.status(429).json(
        createResponse(
          false,
          `Please wait ${secondsRemaining} seconds before making another purchase.`,
          { retry_after: secondsRemaining }
        )
      );
    }

    next();
  } catch (error) {
    console.error('Purchase cooldown check error:', error);
    // Don't block on error
    next();
  }
};


module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwnerOrAdmin,
  requireEmailVerification,
  requireMembershipTier,
  optionalAuth,
  // authenticatedRateLimit
  authorizeEventOrganizer,
  requireEventRole,
  checkPurchaseCooldown
};