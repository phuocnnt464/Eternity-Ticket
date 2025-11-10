// src/routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { validate, sanitizeInput } = require('../middleware/validationMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('../validations/authValidation');

const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    // message: 'Too many authentication attempts, please try again later.',
    // retry_after: '15 minutes'
    error: {
      message: 'Too many authentication attempts from this IP. Please try again later.',
      retry_after: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 5 requests per windowMs for sensitive endpoints
  message: {
    success: false,
    // message: 'Too many failed attempts, please try again later.',
    // retry_after: '15 minutes'
    error: {
      message: 'Too many failed attempts. Your IP has been temporarily blocked.',
      retry_after: '15 minutes'
    }
  }
});

// Refresh token limiter (more lenient)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Too many refresh token requests. Please try again later.'
    }
  }
});

// Public routes 

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  authLimiter,
  validate(registerSchema),
  logActivity('REGISTER', 'USER'),
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  authLimiter, 
  validate(loginSchema),
  logActivity('LOGIN', 'USER'),
  AuthController.login
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email with token
 * @access  Public
 */
router.post('/verify-email',
  strictAuthLimiter,
  validate(verifyEmailSchema),
  logActivity('VERIFY_EMAIL', 'USER'),
  AuthController.verifyEmail
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', 
  refreshLimiter,
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password',
  strictAuthLimiter,
  validate(forgotPasswordSchema),
  logActivity('FORGOT_PASSWORD', 'USER'),
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, new_password, confirm_password }
 */
router.post('/reset-password',
  strictAuthLimiter,
  validate(resetPasswordSchema),
  logActivity('RESET_PASSWORD', 'USER'),
  AuthController.resetPassword
);

// Protected routes (authentication required)
// const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', 
  authenticateToken, 
  AuthController.getProfile
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', 
  authenticateToken, 
  logActivity('LOGOUT', 'USER'),
  AuthController.logout
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @body    { current_password, new_password, confirm_password }
 * @headers Authorization: Bearer {token}
 */
router.post('/change-password',
  authenticateToken,
  strictAuthLimiter,
  validate(changePasswordSchema),
  logActivity('CHANGE_PASSWORD', 'USER'),
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Private
 * @headers Authorization: Bearer {token}
 */
router.post('/resend-verification',
  authenticateToken,
  strictAuthLimiter,
  logActivity('RESEND_VERIFICATION', 'USER'),
  AuthController.resendVerification
);

//Temporary endpoint to test authentication without middleware
// router.get('/test', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Auth routes are working!',
//     timestamp: new Date().toISOString()
//   });
// });

/**
 * @route   GET /api/auth/check-email/:email
 * @desc    Check if email already exists
 * @access  Public
 */
router.get('/check-email/:email',
  AuthController.checkEmailExists
);

// =============================================
// HEALTH CHECK / TEST ROUTES
// =============================================

/**
 * @route   GET /api/auth/health
 * @desc    Test auth routes health
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const pool = require('../config/database');
    await pool.query('SELECT 1');
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        message: 'Auth routes are operational',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          public: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/verify-email',
            'POST /api/auth/refresh-token',
            'POST /api/auth/forgot-password',
            'POST /api/auth/reset-password'
          ],
          protected: [
            'GET /api/auth/profile',
            'POST /api/auth/logout',
            'POST /api/auth/change-password',
            'POST /api/auth/resend-verification'
          ]
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        status: 'unhealthy',
        message: 'Database connection failed',
        details: error.message
      }
    });
  }
});

// Test route (development only)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Auth routes test endpoint',
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = router;