// src/controllers/userController.js
const UserModel = require('../models/userModel');
const { createResponse, validatePassword, paginate } = require('../utils/helpers');
const pool = require('../config/database');

class UserController {
  /**
   * Get user by ID
   * GET /api/users/:userId
   * @access Private (Owner or Admin)
   */
  static async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const isAdmin = ['admin', 'sub_admin'].includes(req.user.role);

      // Check permissions
      if (userId !== requestingUserId && !isAdmin) {
        return res.status(403).json(
          createResponse(false, 'Access denied. You can only view your own profile.')
        );
      }

      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json(
          createResponse(false, 'User not found')
        );
      }

      // Get user statistics
      const stats = await UserModel.getUserStats(userId);

      // Get membership info
      const membership = await UserModel.getUserMembership(userId);

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
          is_active: user.is_active,
          last_login_at: user.last_login_at,
          created_at: user.created_at
        },
        membership: membership || {
          tier: 'basic',
          is_active: false
        },
        statistics: {
          total_orders: parseInt(stats.total_orders) || 0,
          total_tickets: parseInt(stats.total_tickets) || 0,
          used_tickets: parseInt(stats.used_tickets) || 0,
          events_attended: parseInt(stats.events_attended) || 0,
          total_spent: parseFloat(stats.total_spent) || 0
        }
      };

      res.json(
        createResponse(true, 'User profile retrieved successfully', responseData)
      );

    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve user profile')
      );
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
          createResponse(false, 'User profile not found')
        );
      }

      // Get user statistics
      const stats = await UserModel.getUserStats(userId);

      const membership = await UserModel.getUserMembership(userId)

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
          created_at: user.created_at,
          // membership: {
          //   tier: user.membership_tier || 'basic',
          //   start_date: user.membership_start,
          //   end_date: user.membership_end
          // }
        },
        membership: membership || {
          tier: 'basic',
          is_active: false
        },
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
      console.error('❌ Get profile error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve profile. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateProfile(req, res) {
    try {
      // const userId = req.user.id;
      const { userId } = req.params; 
      const updateData = req.body;
      const requestingUserId = req.user.id;
      const isAdmin = req.isAdmin || false; // set by authorizeOwnerOrAdmin middleware

      // Check permissions
      if (userId !== requestingUserId && !isAdmin) {
        return res.status(403).json(
          createResponse(false, 'Access denied. You can only update your own profile.')
        );
      }

      // Remove fields that shouldn't be updated via this endpoint
      const forbiddenFields = [
        'id', 'email', 'password','password_hash', 'role', 
        'is_email_verified', 'is_active', 'email_verification_token',
        'reset_password_token', 'failed_login_attempts',
        'account_locked_until', 'created_at', 'updated_at'
      ];

      forbiddenFields.forEach(field => delete updateData[field]);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json(
          createResponse(false, 'No valid fields provided for update')
        );
      }

      console.log(`Updating profile for user: ${userId}`, Object.keys(updateData))

      // Update user profile
      const updatedUser = await UserModel.updateProfile(userId, updateData);

      const responseData = {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone,
          avatar_url: updatedUser.avatar_url,
          date_of_birth: updatedUser.date_of_birth,
          gender: updatedUser.gender,
          address: updatedUser.address,
          city: updatedUser.city,
          country: updatedUser.country,
          is_email_verified: updatedUser.is_email_verified,
          updated_at: updatedUser.updated_at
        }
      };

      const response = createResponse(
        true,
        'Profile updated successfully',
        responseData
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Update profile error:', error.message);

      let statusCode = 500;
      let message = 'Failed to update profile.';

      if (error.message === 'User not found or inactive') {
        statusCode = 404;
        message = 'User not found';
      } else if (error.message === 'No valid fields to update') {
        statusCode = 400;
        message = 'No valid fields provided for update';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  // static async changePassword(req, res) {
  //   try {
  //     const userId = req.user.id;
  //     const { currentPassword, newPassword } = req.body;

  //     // Validate new password strength
  //     const passwordValidation = validatePassword(newPassword);
  //     if (!passwordValidation.isValid) {
  //       return res.status(400).json(
  //         createResponse(false, 'New password does not meet requirements', null, {
  //           errors: passwordValidation.errors
  //         })
  //       );
  //     }

  //     // Change password
  //     await UserModel.changePassword(userId, currentPassword, newPassword);

  //     console.log(`🔒 Password changed successfully for user: ${req.user.email}`);

  //     const response = createResponse(
  //       true,
  //       'Password changed successfully. Please log in with your new password.'
  //     );

  //     res.json(response);

  //   } catch (error) {
  //     console.error('❌ Change password error:', error.message);

  //     let statusCode = 500;
  //     let message = 'Failed to change password. Please try again later.';

  //     if (error.message === 'User not found') {
  //       statusCode = 404;
  //       message = 'User not found';
  //     } else if (error.message === 'Current password is incorrect') {
  //       statusCode = 400;
  //       message = 'Current password is incorrect';
  //     }

  //     const response = createResponse(false, message);
  //     res.status(statusCode).json(response);
  //   }
  // }

  /**
   * Get user's ticket history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  // static async getTicketHistory(req, res) {
  //   try {
  //     const userId = req.user.id;
  //     const { page = 1, limit = 10, status } = req.query;

  //     console.log(`🎫 Getting ticket history for user: ${userId}, page: ${page}, limit: ${limit}`);

  //     // Build query conditions
  //     let whereCondition = 'WHERE t.user_id = $1';
  //     let queryParams = [userId];
  //     let paramCount = 2;

  //     if (status) {
  //       whereCondition += ` AND o.status = $${paramCount}`;
  //       queryParams.push(status);
  //       paramCount++;
  //     }

  //     // Calculate pagination - Convert to integers
  //     const pageNum = parseInt(page);
  //     const limitNum = parseInt(limit);
  //     const offset = (pageNum - 1) * limitNum;

  //     // Simplified query first - check if user has any tickets at all
  //     const simpleCheckQuery = `
  //       SELECT COUNT(*) as total
  //       FROM users u
  //       LEFT JOIN orders o ON u.id = o.user_id
  //       LEFT JOIN tickets t ON o.id = t.order_id
  //       WHERE u.id = $1
  //     `;

  //     const pool = require('../config/database');
  //     const checkResult = await pool.query(simpleCheckQuery, [userId]);
  //     console.log(`📊 Total tickets found for user: ${checkResult.rows[0].total}`);

  //     // If no tickets, return empty result
  //     if (parseInt(checkResult.rows[0].total) === 0) {
  //       const responseData = {
  //         tickets: [],
  //         pagination: {
  //           current_page: pageNum,
  //           total_pages: 0,
  //           total_count: 0,
  //           per_page: limitNum,
  //           has_next: false,
  //           has_previous: false
  //         },
  //         message: 'No tickets found. Start by purchasing tickets for events!'
  //       };

  //       const response = createResponse(
  //         true,
  //         'Ticket history retrieved successfully',
  //         responseData
  //       );

  //       return res.json(response);
  //     }

  //     // Full query with all joins - only if tickets exist
  //     const historyQuery = `
  //       SELECT 
  //         t.id as ticket_id,
  //         t.ticket_code,
  //         t.status as ticket_status,
  //         t.is_checked_in,
  //         t.checked_in_at,
  //         t.created_at as purchase_date,
  //         e.title as event_title,
  //         e.cover_image as event_image,
  //         es.title as session_title,
  //         es.start_time as session_start_time,
  //         es.end_time as session_end_time,
  //         tt.name as ticket_type_name,
  //         tt.price as ticket_price,
  //         o.order_number,
  //         o.status as order_status,
  //         o.total_amount as order_total,
  //         o.created_at as order_date
  //       FROM tickets t
  //       JOIN orders o ON t.order_id = o.id
  //       JOIN events e ON t.event_id = e.id
  //       JOIN event_sessions es ON t.session_id = es.id
  //       JOIN ticket_types tt ON t.ticket_type_id = tt.id
  //       JOIN order_items oi ON t.order_item_id = oi.id
  //       ${whereCondition}
  //       ORDER BY t.created_at DESC
  //       LIMIT $${paramCount} OFFSET $${paramCount + 1}
  //     `;

  //     // Get total count for pagination
  //     const countQuery = `
  //       SELECT COUNT(*) as total
  //       FROM tickets t
  //       JOIN orders o ON t.order_id = o.id
  //       ${whereCondition}
  //     `;

  //     // Push limit and offset in CORRECT order at the END
  //     const historyParams = [...queryParams, limitNum, offset];

  //     const [historyResult, countResult] = await Promise.all([
  //       pool.query(historyQuery, historyParams),
  //       pool.query(countQuery, queryParams) // Remove limit and offset for count
  //     ]);

  //     const tickets = historyResult.rows;
  //     const totalCount = parseInt(countResult.rows[0].total);
  //     const totalPages = Math.ceil(totalCount / limitNum);

  //     console.log(`✅ Found ${tickets.length} tickets for current page`);

  //     const responseData = {
  //       tickets: tickets.map(ticket => ({
  //         ...ticket,
  //         ticket_price: parseFloat(ticket.ticket_price),
  //         order_total: parseFloat(ticket.order_total)
  //       })),
  //       pagination: {
  //         current_page: pageNum,
  //         total_pages: totalPages,
  //         total_count: totalCount,
  //         per_page: limitNum,
  //         has_next: pageNum < totalPages,
  //         has_previous: pageNum > 1
  //       }
  //     };

  //     const response = createResponse(
  //       true,
  //       'Ticket history retrieved successfully',
  //       responseData
  //     );

  //     res.json(response);

  //   } catch (error) {
  //     console.error('❌ Get ticket history error:', error.message);
  //     console.error('❌ Error stack:', error.stack);
      
  //     const response = createResponse(
  //       false,
  //       `Failed to retrieve ticket history: ${error.message}`
  //     );
      
  //     res.status(500).json(response);
  //   }
  // }

  /**
   * Get user's ticket history
   * GET /api/users/:userId/tickets
   * @access Private (Owner or Admin)
   */
  static async getTicketHistory(req, res) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const isAdmin = ['admin', 'sub_admin'].includes(req.user.role);

      // Check permissions
      if (userId !== requestingUserId && !isAdmin) {
        return res.status(403).json(
          createResponse(false, 'Access denied')
        );
      }

      const { page = 1, limit = 10, status, event_id } = req.query;
      const pagination = paginate(page, limit);

      console.log(`🎫 Getting ticket history for user: ${userId}`);

      // Build WHERE conditions
      const conditions = ['t.user_id = $1'];
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (event_id) {
        conditions.push(`t.event_id = $${paramIndex}`);
        params.push(event_id);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tickets t
        JOIN orders o ON t.order_id = o.id
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get tickets with pagination
      const ticketsQuery = `
        SELECT 
          t.id,
          t.ticket_code,
          t.status,
          t.is_checked_in,
          t.checked_in_at,
          t.holder_name,
          t.created_at as purchase_date,
          e.id as event_id,
          e.title as event_title,
          e.cover_image as event_image,
          es.title as session_title,
          es.start_time,
          es.end_time,
          tt.name as ticket_type,
          tt.price,
          o.order_number,
          o.status as order_status,
          o.total_amount
        FROM tickets t
        JOIN orders o ON t.order_id = o.id
        JOIN events e ON t.event_id = e.id
        JOIN event_sessions es ON t.session_id = es.id
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const ticketsResult = await pool.query(
        ticketsQuery,
        [...params, pagination.limit, pagination.offset]
      );

      const paginationMeta = paginate(page, limit, totalCount);

      const responseData = {
        tickets: ticketsResult.rows.map(ticket => ({
          ...ticket,
          price: parseFloat(ticket.price),
          total_amount: parseFloat(ticket.total_amount)
        })),
        pagination: paginationMeta
      };

      res.json(
        createResponse(
          true,
          'Ticket history retrieved successfully',
          responseData
        )
      );

    } catch (error) {
      console.error('❌ Get ticket history error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve ticket history')
      );
    }
  }

  /**
   * Get user's order history
   * GET /api/users/:userId/orders
   * @access Private (Owner or Admin)
   */
  static async getOrderHistory(req, res) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      const isAdmin = ['admin', 'sub_admin'].includes(req.user.role);

      // Check permissions
      if (userId !== requestingUserId && !isAdmin) {
        return res.status(403).json(
          createResponse(false, 'Access denied')
        );
      }

      const { page = 1, limit = 10, status } = req.query;
      const pagination = paginate(page, limit);

      // Build WHERE conditions
      const conditions = ['o.user_id = $1'];
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get orders with pagination
      const ordersQuery = `
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.subtotal,
          o.membership_discount,
          o.coupon_discount,
          o.vat_amount,
          o.total_amount,
          o.payment_method,
          o.paid_at,
          o.created_at,
          e.id as event_id,
          e.title as event_title,
          e.cover_image,
          COUNT(t.id) as ticket_count
        FROM orders o
        JOIN events e ON o.event_id = e.id
        LEFT JOIN tickets t ON o.id = t.order_id
        WHERE ${whereClause}
        GROUP BY o.id, e.id
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const ordersResult = await pool.query(
        ordersQuery,
        [...params, pagination.limit, pagination.offset]
      );

      const paginationMeta = paginate(page, limit, totalCount);

      const responseData = {
        orders: ordersResult.rows.map(order => ({
          ...order,
          subtotal: parseFloat(order.subtotal),
          membership_discount: parseFloat(order.membership_discount),
          coupon_discount: parseFloat(order.coupon_discount),
          vat_amount: parseFloat(order.vat_amount),
          total_amount: parseFloat(order.total_amount),
          ticket_count: parseInt(order.ticket_count)
        })),
        pagination: paginationMeta
      };

      res.json(
        createResponse(
          true,
          'Order history retrieved successfully',
          responseData
        )
      );

    } catch (error) {
      console.error('❌ Get order history error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve order history')
      );
    }
  }

  /**
   * Deactivate user account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  // static async deactivateAccount(req, res) {
  //   try {
  //     const userId = req.user.id;
  //     const { password } = req.body;

  //     // Verify password before deactivation
  //     const user = await UserModel.findByEmail(req.user.email);
  //     if (!user) {
  //       return res.status(404).json(
  //         createResponse(false, 'User not found')
  //       );
  //     }

  //     const isPasswordValid = await UserModel.verifyPassword(password, user.password_hash);
  //     if (!isPasswordValid) {
  //       return res.status(400).json(
  //         createResponse(false, 'Incorrect password. Account deactivation cancelled.')
  //       );
  //     }

  //     // Deactivate account
  //     const success = await UserModel.deactivateAccount(userId);
      
  //     if (!success) {
  //       return res.status(404).json(
  //         createResponse(false, 'User not found or already deactivated')
  //       );
  //     }

  //     console.log(`🗑️ Account deactivated for user: ${req.user.email}`);

  //     const response = createResponse(
  //       true,
  //       'Account has been deactivated successfully. We\'re sorry to see you go!'
  //     );

  //     res.json(response);

  //   } catch (error) {
  //     console.error('❌ Deactivate account error:', error.message);
      
  //     const response = createResponse(
  //       false,
  //       'Failed to deactivate account. Please try again later.'
  //     );
      
  //     res.status(500).json(response);
  //   }
  // }

  /**
   * Deactivate user account
   * DELETE /api/users/:userId
   * @access Private (Owner or Admin)
   */
  static async deactivateAccount(req, res) {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      const requestingUserId = req.user.id;
      const isAdmin = req.isAdmin || false;

      // Check permissions
      if (userId !== requestingUserId && !isAdmin) {
        return res.status(403).json(
          createResponse(false, 'Access denied')
        );
      }

      // Admin doesn't need password to deactivate others
      if (!isAdmin || userId === requestingUserId) {
        if (!password) {
          return res.status(400).json(
            createResponse(false, 'Password is required to deactivate account')
          );
        }

        // Verify password
        const user = await UserModel.findByEmail(req.user.email);
        if (!user) {
          return res.status(404).json(
            createResponse(false, 'User not found')
          );
        }

        const isPasswordValid = await UserModel.verifyPassword(
          password, 
          user.password_hash
        );

        if (!isPasswordValid) {
          return res.status(400).json(
            createResponse(false, 'Incorrect password')
          );
        }
      }

      // Deactivate account
      const success = await UserModel.deactivateAccount(userId);
      
      if (!success) {
        return res.status(404).json(
          createResponse(false, 'User not found or already deactivated')
        );
      }

      console.log(`🗑️  Account deactivated: ${userId}`);

      res.json(
        createResponse(
          true,
          'Account has been deactivated successfully'
        )
      );

    } catch (error) {
      console.error('❌ Deactivate account error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to deactivate account')
      );
    }
  }

  /**
   * Get all users (Admin only)
   * GET /api/admin/users
   * @access Private (Admin only)
   */
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, is_active, search } = req.query;

      const filters = {
        role,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        page,
        limit,
        search
      };

      const result = await UserModel.getAllUsers(filters);

      res.json(
        createResponse(
          true,
          'Users retrieved successfully',
          {
            users: result.users,
            pagination: result.pagination
          }
        )
      );

    } catch (error) {
      console.error('❌ Get all users error:', error);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve users')
      );
    }
  }

  static async uploadAvatar(req, res) {
    try {
      const { userId } = req.params;
    
      if (!req.processedAvatar) {
        return res.status(400).json(
          createResponse(false, 'No avatar file provided')
        );
      }

      // Update user avatar in database
      await UserModel.updateProfile(userId, { 
        avatar_url: req.processedAvatar 
      });

      console.log(`📷 Avatar uploaded for user: ${userId}`);

      res.json(
        createResponse(
          true,
          'Avatar uploaded successfully',
          { avatar_url: req.processedAvatar }
        )
      );

    } catch (error) {
      console.error('❌ Upload avatar error:', error);
    
      // Clean up uploaded file on error
      if (req.processedAvatar) {
        const { deleteFile } = require('../middleware/uploadMiddleware');
        await deleteFile(req.processedAvatar);
      }
    
      res.status(500).json(
        createResponse(false, 'Failed to upload avatar')
      );
    }
  }
}

module.exports = UserController;