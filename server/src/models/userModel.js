// src/models/userModel.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class UserModel {
  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} Created user and verification token
   */
  static async create(userData) {
    const {
      email,
      password,
      role = 'participant',
      first_name,
      last_name,
      phone
    } = userData;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);
      
      // Generate verification token
      const email_verification_token = uuidv4();

      const userQuery = `
        INSERT INTO users (
          email, password_hash, role, first_name, last_name, 
          phone, email_verification_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, role, first_name, last_name, phone, 
                 is_email_verified, is_active, created_at
      `;

      const userValues = [
        email.toLowerCase().trim(),
        password_hash,
        role,
        first_name.trim(),
        last_name.trim(),
        phone ? phone.trim() : null,
        email_verification_token
      ];

      const userResult = await client.query(userQuery, userValues);
      
      // If user is participant, create basic membership
      if (role === 'participant') {
        const membershipQuery = `
          INSERT INTO memberships (user_id, tier, is_active)
          VALUES ($1, 'basic', true)
          ON CONFLICT (user_id) WHERE is_active = true DO NOTHING
        `;
        await client.query(membershipQuery, [userResult.rows[0].id]);
      }

      await client.query('COMMIT');

      return {
        user: userResult.rows[0],
        verification_token: email_verification_token
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error.code === '23505') {
        if (error.constraint && error.constraint.includes('email')) {
          throw new Error('Email already exists');
        }
      }
      throw error;
      
    } finally {
      client.release();
    }
  }

  /**
   * Find user by email
   * @param {String} email - User email
   * @returns {Object|null} User data
   */
  static async findByEmail(email) {
    const query = `
      SELECT u.*, m.tier as membership_tier
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.is_active = true
      WHERE u.email = $1 AND u.is_active = true
    `;
    
    try {
      const result = await pool.query(query, [email.toLowerCase().trim()]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  static async findByEmailAnyRole(email) {
    const query = `
      SELECT id, email, role, is_active
      FROM users
      WHERE email = $1  -- Không filter by is_active để check toàn bộ
    `;
    try {
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Error finding user by email: ${error.message}`);
  }
  }

  /**
   * Check if email exists
   * @param {String} email - Email to check
   * @returns {Boolean} Email exists
   */
  static async emailExists(email) {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists
    `;

    try {
      const result = await pool.query(query, [email.toLowerCase().trim()]);
      return result.rows[0].exists;
    } catch (error) {
      throw new Error(`Error checking email existence: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   * @param {String} id - User ID
   * @returns {Object|null} User data
   */
  static async findById(id) {
    const query = `
      SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone,
             u.avatar_url, u.date_of_birth, u.gender, u.address, u.city, u.country,
             u.is_email_verified, u.is_active, u.last_login_at, u.created_at,
             m.tier as membership_tier, m.start_date as membership_start,
             m.end_date as membership_end
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.is_active = true
      WHERE u.id = $1 AND u.is_active = true
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  /**
   * Verify password
   * @param {String} plainPassword - Plain text password
   * @param {String} hashedPassword - Hashed password from database
   * @returns {Boolean} Password match result
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Error verifying password: ${error.message}`);
    }
  }

  /**
   * Update last login timestamp
   * @param {String} userId - User ID
   */
  static async updateLastLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error.message);
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   * @param {String} userId - User ID
   */
  static async incrementFailedLoginAttempts(userId) {
    const query = `
      UPDATE users 
      SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
          updated_at = NOW()
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error incrementing failed login attempts:', error.message);
    }
  }

  /**
   * Reset failed login attempts
   * @param {String} userId - User ID
   */
  static async resetFailedLoginAttempts(userId) {
    const query = `
      UPDATE users 
      SET failed_login_attempts = 0,
          account_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error resetting failed login attempts:', error.message);
    }
  }

  /**
   * Lock account temporarily
   * @param {String} userId - User ID
   * @param {Number} minutes - Lock duration in minutes
   */
  static async lockAccount(userId, minutes = 15) {
    const lockUntil = new Date(Date.now() + minutes * 60 * 1000);
    
    // const query = `
    //   UPDATE users 
    //   SET account_locked_until = NOW() + INTERVAL '${minutes} minutes',
    //       updated_at = NOW()
    //   WHERE id = $1
    // `;
    
    const query = `
      UPDATE users
      SET account_locked_until = $1,
          failed_login_attempts = 0,
          updated_at = NOW()
      WHERE id = $2
    `;

    try {
      await pool.query(query, [lockUntil,userId]);
    } catch (error) {
      console.error('Error locking account:', error.message);
      throw error;
    }
  }

  /**
   * Get user membership info
   * @param {String} userId - User ID
   * @returns {Object|null} Membership data
   */
  static async getUserMembership(userId) {
    const query = `
      SELECT 
        tier, 
        start_date, 
        end_date, 
        is_active,
        payment_amount,
        payment_date,
        auto_renewal
      FROM memberships
      WHERE user_id = $1 AND is_active = true
      ORDER BY start_date DESC
      LIMIT 1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error getting user membership: ${error.message}`);
    }
  }

  /**
   * Verify email with token
   * @param {String} token - Verification token
   * @returns {Object|null} User data if verification successful
   */
  static async verifyEmail(token) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        UPDATE users 
        SET is_email_verified = true, 
            email_verification_token = NULL,
            updated_at = NOW()
        WHERE email_verification_token = $1 AND is_active = true
        RETURNING id, email, first_name, last_name, role
      `;
      
      const result = await client.query(query, [token]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error verifying email: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Generate password reset token
   * @param {String} userId - User ID
   * @returns {String} Reset token
   */
  static async generatePasswordResetToken(userId) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    const query = `
      UPDATE users 
      SET reset_password_token = $1,
          reset_password_expires_at = NOW() + INTERVAL '1 hour',
          updated_at = NOW()
      WHERE id = $2
    `;
    
    try {
      await pool.query(query, [tokenHash, userId]);
      return resetToken; // Return unhashed token to send via email
    } catch (error) {
      throw new Error(`Error generating password reset token: ${error.message}`);
    }
  }

  /**
   * Reset password with token
   * @param {String} token - Reset token
   * @param {String} newPassword - New password
   * @returns {Object|null} User data if reset successful
   */
  static async resetPassword(token, newPassword) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Hash the token to compare with database
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find user with valid token
      const findQuery = `
        SELECT id, email FROM users
        WHERE reset_password_token = $1
        AND reset_password_expires_at > NOW()
        AND is_active = true
      `;
      
      const userResult = await client.query(findQuery, [tokenHash]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      
      const user = userResult.rows[0];
      
      // Hash new password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
      // Update password and clear reset token
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1,
            reset_password_token = NULL,
            reset_password_expires_at = NULL,
            failed_login_attempts = 0,
            account_locked_until = NULL,
            updated_at = NOW()
        WHERE id = $2
      `;
      
      await client.query(updateQuery, [passwordHash, user.id]);
      await client.query('COMMIT');
      
      return user;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error resetting password: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update user profile
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user data
   */
  static async updateProfile(userId, updateData) {
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'avatar_url', 
      'date_of_birth', 'gender', 'address', 'city', 'country'
    ];
    
    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic query
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        fieldsToUpdate.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (fieldsToUpdate.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId); // Add userId as last parameter

    const query = `
      UPDATE users 
      SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, role, first_name, last_name, phone,
                avatar_url, date_of_birth, gender, address, city, country,
                is_email_verified, updated_at
    `;

    try {
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating user profile: ${error.message}`);
    }
  }

  /**
   * Change user password
   * @param {String} userId - User ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Boolean} Success status
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current password hash
      const getUserQuery = `
        SELECT password_hash FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const userResult = await client.query(getUserQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword, 
        userResult.rows[0].password_hash
      );
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(12);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);
      
      // Update password
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await client.query(updateQuery, [newPasswordHash, userId]);
      await client.query('COMMIT');
      
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user statistics
   * @param {String} userId - User ID
   * @returns {Object} User statistics
   */
  static async getUserStats(userId) {
    const query = `
      SELECT 
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'paid') as total_orders,
        COUNT(DISTINCT t.id) as total_tickets,
        COUNT(DISTINCT CASE WHEN t.is_checked_in THEN t.id END) as used_tickets,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.total_amount ELSE 0 END), 0) as total_spent,
        COUNT(DISTINCT e.id) as events_attended
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id 
      LEFT JOIN tickets t ON o.id = t.order_id AND o.status = 'paid'
      LEFT JOIN events e ON t.event_id = e.id
      WHERE u.id = $1
      GROUP BY u.id
    `;

    try {
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          total_orders: 0,
          total_tickets: 0,
          used_tickets: 0,
          total_spent: 0,
          events_attended: 0
        };
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting user statistics: ${error.message}`);
    }
  }

  /**
   * Deactivate user account
   * @param {String} userId - User ID
   * @returns {Boolean} Success status
   */
  static async deactivateAccount(userId) {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deactivating account: ${error.message}`);
    }
  }

  /**
   * Get all users (Admin only)
   * @param {Object} filters - Filter options
   * @returns {Array} List of users
   */
  static async getAllUsers(filters = {}) {
    const { role, is_active, page = 1, limit = 20 } = filters;
    
    let conditions = [];
    let params = [];
    let paramCount = 1;
    
    if (role) {
      conditions.push(`u.role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }
    
    if (is_active !== undefined) {
      conditions.push(`u.is_active = $${paramCount}`);
      params.push(is_active);
      paramCount++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        u.id, u.email, u.role, u.first_name, u.last_name, u.phone,
        u.is_email_verified, u.is_active, u.last_login_at, u.created_at,
        m.tier as membership_tier
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.is_active = true
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    params.push(limit, offset);
    
    try {
      const result = await pool.query(query, params);
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
      const countResult = await pool.query(countQuery, params.slice(0, -2));
      
      return {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error getting all users: ${error.message}`);
    }
  }
  
  /**
  * Generate new email verification token
  * @param {String} userId - User ID
  * @returns {String} Verification token
  */
  static async generateEmailVerificationToken(userId) {
    const token = uuidv4();
  
    const query = `
      UPDATE users 
      SET email_verification_token = $1,
        updated_at = NOW()
      WHERE id = $2
    `;
  
    try {
      await pool.query(query, [token, userId]);
      return token;
    } catch (error) {
      throw new Error(`Error generating email verification token: ${error.message}`);
    }
  }

  /**
   * Search users by name or email (Admin)
   * @param {String} searchTerm - Search term
   * @param {Number} limit - Result limit
   * @returns {Array} Matching users
   */
  static async searchUsers(searchTerm, limit = 10) {
    const query = `
      SELECT 
        u.id, u.email, u.role, u.first_name, u.last_name,
        u.is_email_verified, u.is_active, u.created_at,
        m.tier as membership_tier
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.is_active = true
      WHERE (
        LOWER(u.email) LIKE LOWER($1) OR
        LOWER(u.first_name) LIKE LOWER($1) OR
        LOWER(u.last_name) LIKE LOWER($1) OR
        LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($1)
      )
      ORDER BY 
        CASE WHEN LOWER(u.email) = LOWER($2) THEN 1 ELSE 2 END,
        u.created_at DESC
      LIMIT $3
    `;

    try {
      const searchPattern = `%${searchTerm}%`;
      const result = await pool.query(query, [searchPattern, searchTerm, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }

  /**
   * Update user role (Admin only)
   * @param {String} userId - User ID
   * @param {String} newRole - New role
   * @returns {Object} Updated user
   */
  static async updateUserRole(userId, newRole) {
    const allowedRoles = ['participant', 'organizer', 'admin', 'sub_admin'];
    
    if (!allowedRoles.includes(newRole)) {
      throw new Error('Invalid role');
    }

    const query = `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2 AND is_active = true
      RETURNING id, email, role, first_name, last_name
    `;

    try {
      const result = await pool.query(query, [newRole, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating user role: ${error.message}`);
    }
  }

  /**
   * Reactivate user account (Admin only)
   * @param {String} userId - User ID
   * @returns {Boolean} Success status
   */
  static async reactivateAccount(userId) {
    const query = `
      UPDATE users 
      SET is_active = true, 
          failed_login_attempts = 0,
          account_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error reactivating account: ${error.message}`);
    }
  }

  /**
   * Get user activity logs (Admin)
   * @param {String} userId - User ID
   * @param {Number} limit - Result limit
   * @returns {Array} Activity logs
   */
  static async getUserActivityLogs(userId, limit = 50) {
    const query = `
      SELECT 
        action,
        description,
        entity_type,
        entity_id,
        ip_address,
        created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting user activity logs: ${error.message}`);
    }
  }

  /**
   * Get users count by role (Admin dashboard)
   * @returns {Object} Count by role
   */
  static async getUserCountByRole() {
    const query = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM users
      GROUP BY role
    `;

    try {
      const result = await pool.query(query);
      return result.rows.reduce((acc, row) => {
        acc[row.role] = {
          total: parseInt(row.count),
          active: parseInt(row.active_count)
        };
        return acc;
      }, {});
    } catch (error) {
      throw new Error(`Error getting user count by role: ${error.message}`);
    }
  }

  /**
   * Get recently registered users (Admin dashboard)
   * @param {Number} days - Days to look back
   * @param {Number} limit - Result limit
   * @returns {Array} Recent users
   */
  static async getRecentUsers(days = 7, limit = 10) {
    const query = `
      SELECT 
        u.id, u.email, u.role, u.first_name, u.last_name,
        u.is_email_verified, u.created_at,
        m.tier as membership_tier
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.is_active = true
      WHERE u.created_at >= NOW() - ($1 || ' days')::INTERVAL
      ORDER BY u.created_at DESC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [days, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting recent users: ${error.message}`);
    }
  }

  /**
   * Bulk update users (Admin only)
   * @param {Array} userIds - Array of user IDs
   * @param {Object} updateData - Data to update
   * @returns {Number} Number of updated users
   */
  static async bulkUpdateUsers(userIds, updateData) {
    const allowedFields = ['is_active', 'role'];
    const updates = [];
    const values = [userIds];
    let paramCount = 2;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ANY($1)
    `;

    try {
      const result = await pool.query(query, values);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error bulk updating users: ${error.message}`);
    }
  }

  /**
   * Delete user permanently (Admin only - DANGEROUS)
   * @param {String} userId - User ID
   * @returns {Boolean} Success status
   */
  static async deleteUserPermanently(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete related data first due to foreign key constraints
      await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
      
      // Delete user
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      return result.rowCount > 0;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error deleting user permanently: ${error.message}`);
    } finally {
      client.release();
    }
  }
} 

module.exports = UserModel;