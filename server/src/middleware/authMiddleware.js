// src/middleware/authMiddleware.js
const { verifyToken, createResponse } = require('../utils/helpers');
const UserModel = require('../models/userModel');
const pool = require('../config/database');

/**
 * Log failed authentication attempt
 */
async function logFailedAuth(ip, reason) {
  try {
    await pool.query(`
      INSERT INTO activity_logs (action, description, ip_address, metadata)
      VALUES ('auth_failed', 'Failed authentication attempt', $1, $2)
    `, [ip, JSON.stringify({ reason })]);
  } catch (error) {
    console.error('Failed to log auth attempt:', error);
  }
}

/**
 * Check rate limit for IP
 */
async function checkRateLimit(key) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM rate_limits
      WHERE identifier = $1 
        AND action = 'auth_failed'
        AND window_start > NOW() - INTERVAL '15 minutes'
    `, [key]);
    
    return parseInt(result.rows[0]?.count || 0);
  } catch (error) {
    console.error('Rate limit check error:', error);
    return 0; // Don't block on error
  }
}

/**
 * Increment fail counter
 */
async function incrementFailCounter(key) {
  try {
    await pool.query(`
      INSERT INTO rate_limits (identifier, action, window_start, request_count)
      VALUES ($1, 'auth_failed', NOW(), 1)
      ON CONFLICT (identifier, action, window_start)
      DO UPDATE SET request_count = rate_limits.request_count + 1
    `, [key]);
  } catch (error) {
    console.error('Failed to increment counter:', error);
  }
}

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
      await logFailedAuth(req.ip, 'missing_token');
      return res.status(401).json(
        createResponse(false, 'Access token is required. Please provide a valid token.')
      );
    }

    // ✅ CHECK BLACKLIST BEFORE VERIFY
    const redisService = require('../services/redisService');
    if (redisService.isReady()) {
      const blacklistKey = `blacklist:token:${token}`;
      const isBlacklisted = await redisService.getClient().get(blacklistKey);
      
      if (isBlacklisted) {
        return res.status(401).json(
          createResponse(false, 'Token has been revoked. Please login again.')
        );
      }
    }

     // ✅ Check rate limit trước khi verify
    const rateLimitKey = `auth_fail:${req.ip}`;
    const failedAttempts = await checkRateLimit(rateLimitKey);
    
    if (failedAttempts > 10) { // 10 attempts per 15 minutes
      return res.status(429).json(
        createResponse(false, 'Too many failed authentication attempts')
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
      membership_tier: user.role === 'participant' 
        ? (user.membership_tier || 'basic') : null
    };

    next();

  } catch (error) {
    // Increment fail counter
    await incrementFailCounter(`auth_fail:${req.ip}`);
    
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

    const eventId = req.params[eventIdParam] || req.query[eventIdParam];

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

/**
 * Event access rate limiter
 * Prevent excessive event permission checks
 */
const eventAccessLimiter = async (req, res, next) => {
  const key = `event_access:${req.user.id}`;
  const pool = require('../config/database');
  
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM rate_limits
      WHERE identifier = $1 
        AND action = 'event_access_check'
        AND window_start > NOW() - INTERVAL '1 minute'
    `, [key]);

    const count = parseInt(result.rows[0].count);

    if (count > 30) { // Max 30 checks per minute
      return res.status(429).json(
        createResponse(
          false,
          'Too many event access checks. Please slow down.',
          { retry_after: 60 }
        )
      );
    }

    // Log this check
    await pool.query(`
      INSERT INTO rate_limits (identifier, action, window_start, request_count)
      VALUES ($1, 'event_access_check', NOW(), 1)
      ON CONFLICT (identifier, action, window_start)
      DO UPDATE SET request_count = rate_limits.request_count + 1
    `, [key]);

    next();
  } catch (error) {
    console.error('Event access limiter error:', error);
    next(); // Don't block on error
  }
};

/**
 * Get system setting value
 */
const getSystemSetting = async (key, defaultValue = null) => {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      [key]
    );
    return result.rows[0]?.setting_value || defaultValue;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Check early access for premium members
 */
const checkEarlyAccess = async (req, res, next) => {
  try {
    const { session_id, tickets } = req.body;
    
    if (!session_id || !tickets || tickets.length === 0) {
      return next();
    }

    const earlyAccessHours = parseInt(
      await getSystemSetting('premium_early_access_hours', '5')
    );

    const premium_early_access_minutes = earlyAccessHours * 60;

    console.log(`🔍 Early access setting: ${earlyAccessHours} hours (${premium_early_access_minutes} minutes)`);

    const ticketTypeIds = tickets.map(t => t.ticket_type_id);
    const userTier = req.user.membership_tier || 'basic';

    // Get tickets with early access
    const result = await pool.query(`
      SELECT 
        tt.id,
        tt.name,
        tt.sale_start_time,
        tt.premium_early_access_minutes
      FROM ticket_types tt
      WHERE tt.id = ANY($1)
        AND tt.premium_early_access_minutes > 0
    `, [ticketTypeIds]);

    if (result.rows.length === 0) {
      return next(); // No early access tickets
    }

    const now = new Date();

    // Hardcode 5 hours (300 minutes) early access for Premium members
    // const premium_early_access_minutes = 300; // 5 hours = 300 minutes (SYSTEM REQUIREMENT)

    for (const ticketType of result.rows) {
      const saleStartTime = new Date(ticketType.sale_start_time);
      // const earlyAccessStart = new Date(
      //   saleStartTime.getTime() - ticketType.premium_early_access_minutes * 60000
      // );

      // ✅ Premium members get 5 hours early access
      const earlyAccessStart = new Date(
        saleStartTime.getTime() - premium_early_access_minutes * 60000
      );

      console.log(`🎫 Ticket: ${ticketType.name}`);
      console.log(`   Sale start: ${saleStartTime}`);
      console.log(`   Early access start: ${earlyAccessStart}`);
      console.log(`   Now: ${now}`);
      console.log(`   In early access period: ${now >= earlyAccessStart && now < saleStartTime}`);

      // Check if in early access period
      if (now >= earlyAccessStart && now < saleStartTime) {
        if (userTier !== 'premium') {
          const minutesRemaining = Math.ceil((saleStartTime - now) / 60000);
          
          return res.status(403).json(
            createResponse(
              false,
              `${ticketType.name} is in Premium early access period. Public sale starts in ${minutesRemaining} minutes.`,
              {
                code: 'PREMIUM_EARLY_ACCESS_ONLY',
                ticket_type: ticketType.name,
                public_sale_start: saleStartTime,
                current_tier: userTier,
                required_tier: 'premium',
                time_remaining_minutes: minutesRemaining,
                premium_early_access_hours: earlyAccessHours
              }
            )
          );
        }
      }
    }

    next();
  } catch (error) {
    console.error('Early access check error:', error);
    next(); // Don't block on error
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
  checkPurchaseCooldown,
  eventAccessLimiter,
  checkEarlyAccess,
  getSystemSetting
};