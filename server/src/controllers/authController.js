const UserModel = require('../models/userModel');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  createResponse,
  validatePassword
} = require('../utils/helpers');

const emailService = require('../services/emailService');
const redisService = require('../services/redisService');
const pool = require('../config/database');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, role, first_name, last_name, phone } = req.body;

      const existingUser = await UserModel.findByEmailAnyRole(email);
    
      if (existingUser) {
        if (existingUser.role === role) {
          return res.status(409).json(
            createResponse(false, 'An account with this email already exists.')
          );
        } else {
          return res.status(409).json(
            createResponse(
              false, 
              `This email is already registered as ${existingUser.role}. You cannot register as ${role} with the same email.`
            )
          );
        }
      }

      // console.log(`Registration attempt for email: ${email}`);

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

      // console.log(`User created successfully with ID: ${result.user.id}`);
 
      await emailService.sendVerificationEmail(
        result.user.email, 
        result.verification_token,
        `${result.user.first_name} ${result.user.last_name}`
      );

      const tokenPayload = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      };

      // console.log(`Tokens generated for user: ${result.user.email}`);

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
        membership: { tier: 'basic', is_active: true }
      };

      const response = createResponse(
        true,
        'User registered successfully! Please check your email for verification.',
        responseData
      );

      res.status(201).json(response);

    } catch (error) {
      console.error('Registration error:', error.message);

      let statusCode = 500;
      let message = 'Registration failed. Please try again.';

      if (error.message === 'Email already exists') {
        statusCode = 409;
        message = 'An account with this email already exists.';
      } else if (error.message.includes('validation')) {
        statusCode = 400;
        message = 'Invalid input data. Please check your information.';
      } else if (error.code === '23505') {
        statusCode = 409;
        message = 'Email already exists';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // console.log(`Login attempt for email: ${email}`);

      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        console.log(`Login failed: User not found: ${email}`);
        return res.status(401).json(
          createResponse(false, 'Invalid email or password.')
        );
      }

      if (!user.is_active) {
        // console.log(`Login failed: Inactive account for email: ${email}`);
        return res.status(403).json(
          createResponse(false, 'Your account has been deactivated.')
        );
      }

      if (!user.is_email_verified) {
        // console.log(`Login failed: Email not verified for: ${email}`);
        return res.status(403).json(
          createResponse(false, 'Please verify your email address before logging in.')
        );
      }

      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        const lockTimeRemaining = Math.ceil(
          (new Date(user.account_locked_until) - new Date()) / 1000 / 60
        );
        // console.log(`Login failed: Account locked - ${email} for ${lockTimeRemaining} minutes`);
        return res.status(423).json(
          createResponse(
            false, 
            `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
            {
              locked_until: user.account_locked_until,
              minutes_remaining: lockTimeRemaining
            }
          )
        );
      }

      const isPasswordValid = await UserModel.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        // console.log(`Login failed: Invalid password - ${email}`);
   
        await UserModel.incrementFailedLoginAttempts(user.id);
        
        const updatedUser = await UserModel.findById(user.id);
        const failedAttempts = updatedUser.failed_login_attempts || 0;

        if (failedAttempts >= 5) {
          await UserModel.lockAccount(user.id, 15);

          // console.log(`Account locked after 5 failed attempts: ${email}`);

          return res.status(423).json(
            createResponse(
              false, 
              'Too many failed login attempts. Your account has been locked for 15 minutes.',
              {
                locked_until: new Date(Date.now() + 15 * 60000)
              }
            )
          );
        }
        
        const attemptsLeft = 5 - failedAttempts;
        return res.status(401).json(
          createResponse(
            false, 
            `Invalid email or password. ${attemptsLeft} attempts remaining before account lock.`,
            { 
              failed_login_attempts: failedAttempts,
              attempts_left: attemptsLeft
            }
          )
        );
      }

      await UserModel.resetFailedLoginAttempts(user.id);

      await UserModel.updateLastLogin(user.id);

      // console.log(`Login successful: ${user.email}`);

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const membership = await UserModel.getUserMembership(user.id);

      const { 
        password_hash, 
        email_verification_token, 
        reset_password_token,
        failed_login_attempts,
        account_locked_until, 
        ...safeUser 
      } = user;

      const responseData = {
        user: {
          ...safeUser,
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_email_verified: user.is_email_verified,
        },
        membership: membership || { tier: 'basic', is_active: false },
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
      console.error('Login error:', error.message);
      
      const response = createResponse(
        false, 
        'Login failed.'
      );
      
      res.status(500).json(response);
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json(
          createResponse(false, 'Refresh token is required')
        );
      }
      
      // Check blacklist
      const redisService = require('../services/redisService');
      if (redisService.isReady()) {
        const blacklistKey = `blacklist:refresh:${refresh_token}`;
        const isBlacklisted = await redisService.getClient().get(blacklistKey);
        
        if (isBlacklisted) {
          return res.status(401).json(
            createResponse(false, 'Refresh token has been revoked. Please login again.')
          );
        }
      }

      const decoded = verifyToken(refresh_token, process.env.JWT_REFRESH_SECRET);

      const user = await UserModel.findById(decoded.id);
      
      if (!user || !user.is_active) {
        return res.status(401).json(
          createResponse(false, 'Invalid refresh token or user not found')
        );
      }

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
      console.error('Token refresh error:', error.message);
      
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

  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }

      const membership = await UserModel.getUserMembership(userId);

      const stats = await UserModel.getUserStats(userId);

      const responseData = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
          date_of_birth: user.date_of_birth,
          gender: user.gender,
          address: user.address,
          city: user.city,
          country: user.country,
          is_email_verified: user.is_email_verified,
          last_login_at: user.last_login_at,
          created_at: user.created_at
        },
        membership: membership || { tier: 'basic', is_active: false },
        statistics: {
          total_orders: parseInt(stats.total_orders) || 0,
          total_tickets: parseInt(stats.total_tickets) || 0,
          used_tickets: parseInt(stats.used_tickets) || 0,
          events_attended: parseInt(stats.events_attended) || 0,
          total_spent: parseFloat(stats.total_spent) || 0
        }
      };

      const response = createResponse(
        true,
        'Profile retrieved successfully',
        responseData
      );

      res.json(response);

    } catch (error) {
      console.error('Get profile error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve profile'
      );
      
      res.status(500).json(response);
    }
  }

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

      // console.log(`Email verified for user: ${result.email}`);

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
      console.error('Email verification error:', error.message);
      
      const response = createResponse(
        false,
        'Email verification failed. Please try again.'
      );
      
      res.status(500).json(response);
    }
  }

  static async logout(req, res) {
    try {
      const userId = req.user.id;
      const token = req.headers['authorization']?.split(' ')[1]; 

      const decoded = verifyToken(token);
      const expiresAt = decoded.exp;
      const now = Math.floor(Date.now() / 1000);
      const ttl = expiresAt - now;

      if (ttl > 0) {
        if (redisService.isReady()) {
          const blacklistKey = `blacklist:token:${token}`;
          await redisService.getClient().setEx(blacklistKey, ttl, 'revoked');
          console.log(`🔒 Token blacklisted: ${userId} for ${ttl}s`);
        }
      }
      
      const refreshToken = req.body.refresh_token;
      if (refreshToken) {
        
        if (redisService.isReady()) {
          try {
            const decodedRefresh = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
            const refreshTTL = decodedRefresh.exp - now;
            if (refreshTTL > 0) {
              const refreshBlacklistKey = `blacklist:refresh:${refreshToken}`;
              await redisService.getClient().setEx(refreshBlacklistKey, refreshTTL, 'revoked');
            }
          } catch (err) {
            console.log('Failed to blacklist refresh token:', err.message);
          }
        }
      }

      await pool.query(`
        INSERT INTO activity_logs (user_id, action, description, ip_address)
        VALUES ($1, 'LOGOUT', 'User logged out', $2)
      `, [userId, req.ip]);
      
      // console.log(`User logged out: ${req.user.email}`);

      const response = createResponse(
        true,
        'Logged out successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('Logout error:', error.message);
      const response = createResponse(
        true,
        'Logout successful'
      );
      res.json(response);
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        return res.json(
          createResponse(
            true,
            'If an account with that email exists, a password reset link has been sent.'
          )
        );
      }

      const resetToken = await UserModel.generatePasswordResetToken(user.id);

      try{
        await emailService.sendPasswordResetEmail(
          user.email, resetToken,
          `${user.first_name} ${user.last_name}`
        );
      } catch(err) {
        console.error('Failed to send password reset email:', err);
      }

      // console.log(`Password reset requested for: ${email}`);

      res.json(
        createResponse(
          true,
          'If an account with that email exists, a password reset link has been sent.'
        )
      );

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to process password reset request')
      );
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, new_password } = req.body;

      const result = await UserModel.resetPassword(token, new_password);
      
      if (!result) {
        return res.status(400).json(
          createResponse(false, 'Invalid or expired reset token')
        );
      }

      // console.log(`Password reset for user: ${result.email}`);

      res.json(
        createResponse(
          true,
          'Password has been reset successfully.'
        )
      );

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to reset password')
      );
    }
  }
  
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      const passwordValidation = validatePassword(new_password);
      if (!passwordValidation.isValid) {
        return res.status(400).json(
          createResponse(false, 'New password does not meet requirements', null, {
            errors: passwordValidation.errors
          })
        );
      }

      await UserModel.changePassword(userId, current_password, new_password);

      console.log(`Password changed for user: ${req.user.email}`);

      res.json(
        createResponse(true, 'Password changed successfully')
      );

    } catch (error) {
      console.error('Change password error:', error);
    
      let statusCode = 500;
      let message = 'Failed to change password';

      if (error.message === 'User not found') {
        statusCode = 404;
        message = 'User not found';
      } else if (error.message === 'Current password is incorrect') {
        statusCode = 400;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  static async resendVerification(req, res) {
    try {
      const userId = req.user.id;

      if (req.user.is_email_verified) {
        return res.status(400).json(
          createResponse(false, 'Email is already verified')
        );
      }

      const token = await UserModel.generateEmailVerificationToken(userId);
      
      try {
        await emailService.sendVerificationEmail(
          req.user.email, 
          token,
          `${req.user.first_name} ${req.user.last_name}`
        );
        // console.log(`Verification email resent to: ${req.user.email}`);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Return error to user since this is the primary function
        return res.status(500).json(
          createResponse(false, 'Failed to send verification email.')
        );
      }
      
      // console.log(`Verification email resent to: ${req.user.email}`);

      res.json(
        createResponse(
          true,
          'Verification email has been sent. Please check your inbox.'
        )
      );

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to resend verification email')
      );
    }
  }

  static async checkEmailExists(req, res) {
    try {
      const { email } = req.params;
      
      const exists = await UserModel.emailExists(email);
      
      res.json(createResponse(
        true,
        exists ? 'Email already registered' : 'Email available',
        { exists, email }
      ));
    } catch (error) {
      console.error('Check email error:', error);
      res.status(500).json(createResponse(false, 'Failed to check email'));
    }
  }
}

module.exports = AuthController;