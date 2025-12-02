const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class UserModel {
  static async create(userData) {
    const {
      email,
      password,
      role = 'participant',
      first_name,
      last_name,
      phone,
      is_email_verified = false
    } = userData;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);
      
      const email_verification_token = uuidv4();

      const userQuery = `
        INSERT INTO users (
          email, password_hash, role, first_name, last_name, 
          phone, email_verification_token, is_email_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
        email_verification_token,
        is_email_verified
      ];

      const userResult = await client.query(userQuery, userValues);
      
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

  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Error verifying password: ${error.message}`);
    }
  }

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

  static async lockAccount(userId, minutes = 15) {
    const lockUntil = new Date(Date.now() + minutes * 60 * 1000);
    
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

  static async generatePasswordResetToken(userId) {
    const resetToken = crypto.randomBytes(32).toString('hex');

    const query = `
      UPDATE users 
      SET reset_password_token = $1,
          reset_password_expires_at = NOW() + INTERVAL '1 hour',
          updated_at = NOW()
      WHERE id = $2
    `;
    
    try {
      await pool.query(query, [resetToken, userId]);

      return resetToken; 
    } catch (error) {
      throw new Error(`Error generating password reset token: ${error.message}`);
    }
  }

  static async resetPassword(token, newPassword) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const findQuery = `
        SELECT id, email, reset_password_token
        FROM users
        WHERE reset_password_token = $1
        AND reset_password_expires_at > NOW()
        AND is_active = true
      `;
      
      const userResult = await client.query(findQuery, [token]);

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log('No matching token found in database');
        return null;
      }
      
      const user = userResult.rows[0];
      
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
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

  static async updateProfile(userId, updateData) {
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'avatar_url', 
      'date_of_birth', 'gender', 'address', 'city', 'country'
    ];
    
    const sanitizedData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        sanitizedData[key] = updateData[key] === '' ? null : updateData[key];
      }
    });
    
    console.log('Sanitized data:', sanitizedData); // Debug
    
    if (Object.keys(sanitizedData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    Object.keys(sanitizedData).forEach(key => {
      fieldsToUpdate.push(`${key} = $${paramCount}`);
      values.push(sanitizedData[key]);
      paramCount++;
    });

    values.push(userId); 

    const query = `
      UPDATE users 
      SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, role, first_name, last_name, phone,
                avatar_url, date_of_birth, gender, address, city, country,
                is_email_verified, updated_at
    `;

    try {
      // console.log('Query:', query);
      // console.log('Values:', values);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }
      
      // console.log('Profile updated successfully');
      return result.rows[0];
    } catch (error) {
      console.error('Database error:', error.message);
      // console.error('Query:', query);
      // console.error('Values:', values);
      throw new Error(`Error updating user profile: ${error. message}`);
    }
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const getUserQuery = `
        SELECT password_hash FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const userResult = await client.query(getUserQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword, 
        userResult.rows[0].password_hash
      );
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      const salt = await bcrypt.genSalt(12);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);
      
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

  static async deleteUserPermanently(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

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