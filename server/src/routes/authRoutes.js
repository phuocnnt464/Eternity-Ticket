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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50,
  message: {
    success: false,
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
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: {
      message: 'Too many failed attempts. Your IP has been temporarily blocked.',
      retry_after: '15 minutes'
    }
  }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: {
      message: 'Too many refresh token requests. Please try again later.'
    }
  }
});

router.post('/register', 
  authLimiter,
  validate(registerSchema),
  logActivity('REGISTER', 'USER'),
  AuthController.register
);

router.post('/login',
  authLimiter, 
  validate(loginSchema),
  logActivity('LOGIN', 'USER'),
  AuthController.login
);

router.post('/verify-email',
  strictAuthLimiter,
  validate(verifyEmailSchema),
  logActivity('VERIFY_EMAIL', 'USER'),
  AuthController.verifyEmail
);

router.post('/refresh-token', 
  refreshLimiter,
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

router.post('/forgot-password',
  strictAuthLimiter,
  validate(forgotPasswordSchema),
  logActivity('FORGOT_PASSWORD', 'USER'),
  AuthController.forgotPassword
);

router.post('/reset-password',
  strictAuthLimiter,
  validate(resetPasswordSchema),
  logActivity('RESET_PASSWORD', 'USER'),
  AuthController.resetPassword
);

router.get('/profile', 
  authenticateToken, 
  AuthController.getProfile
);

router.post('/logout', 
  authenticateToken, 
  logActivity('LOGOUT', 'USER'),
  AuthController.logout
);

router.post('/change-password',
  authenticateToken,
  strictAuthLimiter,
  validate(changePasswordSchema),
  logActivity('CHANGE_PASSWORD', 'USER'),
  AuthController.changePassword
);

router.post('/resend-verification',
  authenticateToken,
  strictAuthLimiter,
  logActivity('RESEND_VERIFICATION', 'USER'),
  AuthController.resendVerification
);

router.get('/check-email/:email',
  AuthController.checkEmailExists
);

module.exports = router;