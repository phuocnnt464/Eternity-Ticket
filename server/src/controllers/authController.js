// src/controllers/authController.js
const UserModel = require('../models/userModel');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  createResponse 
} = require('../utils/helpers');

// TODO: Implement later
// const emailService = require('../services/emailService');
// const sessionService = require('../services/sessionService');

class AuthController {
  /**
   * Register new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async register(req, res) {
    try {
      const { email, password, role, first_name, last_name, phone } = req.body;

      console.log(`📝 Registration attempt for email: ${email}`);

      // Validate role (only participant or organizer can self-register)
      const allowedRoles = ['participant', 'organizer'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json(
          createResponse(false, 'Invalid role. Only participant and organizer are allowed.')
        );
      }

      // Create user
      const result = await UserModel.create({
        email,
        password,
        role,
        first_name,
        last_name,
        phone
      });

      console.log(`✅ User created successfully with ID: ${result.user.id}`);

      // TODO: Send verification email
      // await emailService.sendVerificationEmail(result.user.email, result.verificationToken);

      // Generate tokens
      const tokenPayload = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // TODO: Send verification email
      // await emailService.sendVerificationEmail(result.user.email, result.verificationToken);

      // Log activity
      console.log(`🔑 Tokens generated for user: ${result.user.email}`);

      // Response data
      const responseData = {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          phone: result.user.phone,
          is_email_verified: result.user.is_email_verified,
          created_at: result.user.created_at
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN ||'24h'
        }
      };

      const response = createResponse(
        true,
        'User registered successfully! Please check your email for verification.',
        responseData
      );

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Registration error:', error.message);

      let statusCode = 500;
      let message = 'Registration failed. Please try again.';

      // Handle specific errors
      if (error.message === 'Email already exists') {
        statusCode = 409;
        message = 'An account with this email already exists. Please login or use a different email.';
      } else if (error.message.includes('validation')) {
        statusCode = 400;
        message = 'Invalid input data. Please check your information.';
      } else if (error.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Email already exists';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log(`🔐 Login attempt for email: ${email}`);

      // Find user by email
      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        console.log(`❌ Login failed: User not found: ${email}`);
        return res.status(401).json(
          createResponse(false, 'Invalid email or password. Please try again.')
        );
      }

      // Check if user account is active
      if (!user.is_active) {
        console.log(`❌ Login failed: Inactive account for email: ${email}`);
        return res.status(403).json(
          createResponse(false, 'Your account has been deactivated. Please contact support.')
        );
      }

       // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        const lockTimeRemaining = Math.ceil(
          (new Date(user.account_locked_until) - new Date()) / 1000 / 60
        );
        console.log(`❌ Login failed: Account locked - ${email}`);
        return res.status(423).json(
          createResponse(
            false, 
            `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`
          )
        );
      }

      // Verify password
      const isPasswordValid = await UserModel.verifyPassword(password, user.password_hash);
      
      // if (!isPasswordValid) {
      //   console.log(`❌ Login failed: Invalid password for email: ${email}`);
      //   return res.status(401).json(
      //     createResponse(false, 'Invalid email or password. Please try again.')
      //   );
      // }
      if (!isPasswordValid) {
        console.log(`❌ Login failed: Invalid password - ${email}`);
        
        // Increment failed login attempts
        await UserModel.incrementFailedLoginAttempts(user.id);
        
        // Check if should lock account
        const updatedUser = await UserModel.findById(user.id);
        if (updatedUser.failed_login_attempts >= 5) {
          // Lock account for 15 minutes
          await UserModel.lockAccount(user.id, 15);
          return res.status(423).json(
            createResponse(
              false, 
              'Too many failed login attempts. Your account has been locked for 15 minutes.'
            )
          );
        }
        
        const attemptsLeft = 5 - (updatedUser.failed_login_attempts || 0);
        return res.status(401).json(
          createResponse(
            false, 
            `Invalid email or password. ${attemptsLeft} attempts remaining.`
          )
        );
      }

      // Reset failed login attempts on successful login
      await UserModel.resetFailedLoginAttempts(user.id);

      // Update last login timestamp
      await UserModel.updateLastLogin(user.id);

      console.log(`✅ Login successful: ${user.email}`);

      // Generate tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // TODO: Save session
      // await sessionService.createSession(user.id, refreshToken, req);

      // Get user membership info
      const membership = await UserModel.getUserMembership(user.id);

      // Remove sensitive data from user object
      const { 
        password_hash, 
        email_verification_token, 
        reset_password_token,
        failed_login_attempts,
        account_locked_until, 
        ...safeUser 
      } = user;

      // Response data
      const responseData = {
        user: {
          ...safeUser,
          // membership: {
          //   tier: user.membership_tier || 'basic'
          // }
          membership: membership || { tier: 'basic', is_active: false }
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        }
      };

      const response = createResponse(
        true,
        'Login successful! Welcome back.',
        responseData
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Login error:', error.message);
      
      const response = createResponse(
        false, 
        'Login failed. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Refresh access token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json(
          createResponse(false, 'Refresh token is required')
        );
      }
      
      // Verify refresh token
      const decoded = verifyToken(refresh_token, process.env.JWT_REFRESH_SECRET);

      // TODO: Verify session exists and is valid
      // const session = await sessionService.findSession(refresh_token);
      // if (!session || !session.is_active) {
      //   return res.status(401).json(createResponse(false, 'Invalid session'));
      // }

      // Get updated user info
      const user = await UserModel.findById(decoded.id);
      
      if (!user || !user.is_active) {
        return res.status(401).json(
          createResponse(false, 'Invalid refresh token or user not found')
        );
      }

      // Generate new access token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = generateAccessToken(tokenPayload);

      const responseData = {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      };

      const response = createResponse(
        true,
        'Token refreshed successfully',
        responseData
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Token refresh error:', error.message);
      
      let message = 'Token refresh failed';
      let statusCode = 500;

      if (error.name === 'JsonWebTokenError') {
        message = 'Invalid or expired refresh token';
        statusCode = 401;
      } else if (error.name === 'TokenExpiredError') {
        message = 'Refresh token has expired. Please login again.';
        statusCode = 401;
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }

      // Get membership info
      const membership = await UserModel.getUserMembership(userId);

      // Get user statistics
      const stats = await UserModel.getUserStats(userId);

      // Remove sensitive data
      const { 
        password_hash, 
        email_verification_token, 
        reset_password_token,
        failed_login_attempts,
        account_locked_until,
        ...safeUser 
      } = user;

      // const responseData = {
      //   user: {
      //     ...user,
      //     membership: {
      //       tier: user.membership_tier || 'basic',
      //       start_date: user.membership_start,
      //       end_date: user.membership_end
      //     }
      //   },
      //   statistics: stats
      // };

      const responseData = {
        user: safeUser,
        membership: membership || { tier: 'basic', is_active: false },
        statistics: stats
      };

      const response = createResponse(
        true,
        'Profile retrieved successfully',
        responseData
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get profile error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve profile'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Verify email with token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json(
          createResponse(false, 'Verification token is required')
        );
      }

      const result = await UserModel.verifyEmail(token);
      
      if (!result) {
        return res.status(400).json(
          createResponse(false, 'Invalid or expired verification token')
        );
      }

      console.log(`✅ Email verified for user: ${result.email}`);

      const response = createResponse(
        true,
        'Email verified successfully! You can now access all features.',
        {
          user: {
            id: result.id,
            email: result.email,
            first_name: result.first_name,
            last_name: result.last_name,
            is_email_verified: true
          }
        }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Email verification error:', error.message);
      
      const response = createResponse(
        false,
        'Email verification failed. Please try again.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Logout user (invalidate token - for future Redis implementation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async logout(req, res) {
    try {
      const userId = req.user.id;
      
      // TODO: Invalidate refresh token in database
      // const refreshToken = req.body.refresh_token;
      // if (refreshToken) {
      //   await sessionService.invalidateSession(refreshToken);
      // }

      // For now, just return success
      // In production, you might want to blacklist the token in Redis
      
      console.log(`🚪 User logged out: ${req.user.email}`);

      const response = createResponse(
        true,
        'Logged out successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Logout error:', error.message);
      
      const response = createResponse(
        false,
        'Logout failed'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json(
          createResponse(
            true,
            'If an account with that email exists, a password reset link has been sent.'
          )
        );
      }

      // Generate reset token
      const resetToken = await UserModel.generatePasswordResetToken(user.id);

      // TODO: Send reset email
      // await emailService.sendPasswordResetEmail(user.email, resetToken);

      console.log(`📧 Password reset requested for: ${email}`);

      res.json(
        createResponse(
          true,
          'If an account with that email exists, a password reset link has been sent.'
        )
      );

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to process password reset request')
      );
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req, res) {
    try {
      const { token, new_password } = req.body;

      const result = await UserModel.resetPassword(token, new_password);
      
      if (!result) {
        return res.status(400).json(
          createResponse(false, 'Invalid or expired reset token')
        );
      }

      console.log(`✅ Password reset for user: ${result.email}`);

      res.json(
        createResponse(
          true,
          'Password has been reset successfully. You can now login with your new password.'
        )
      );

    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to reset password')
      );
    }
  }
  

  /**
  * Change password (for logged in users)
  * POST /api/auth/change-password
  */
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      await UserModel.changePassword(userId, current_password, new_password);

      console.log(`✅ Password changed for user: ${req.user.email}`);

      res.json(
        createResponse(true, 'Password changed successfully')
      );

    } catch (error) {
      console.error('❌ Change password error:', error);
    
      let statusCode = 500;
      let message = 'Failed to change password';

      if (error.message === 'Current password is incorrect') {
        statusCode = 400;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  /**
  * Resend email verification
  * POST /api/auth/resend-verification
  */
  static async resendVerification(req, res) {
    try {
      const userId = req.user.id;

      if (req.user.is_email_verified) {
        return res.status(400).json(
          createResponse(false, 'Email is already verified')
        );
      }

      // Generate new verification token
      const token = await UserModel.generateEmailVerificationToken(userId);

      // TODO: Send verification email
      // await emailService.sendVerificationEmail(req.user.email, token);

      console.log(`📧 Verification email resent to: ${req.user.email}`);

      res.json(
        createResponse(
          true,
          'Verification email has been sent. Please check your inbox.'
        )
      );

    } catch (error) {
      console.error('❌ Resend verification error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to resend verification email')
      );
    }
  }
}

module.exports = AuthController;