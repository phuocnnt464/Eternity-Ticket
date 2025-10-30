// src/controllers/eventController.js
const EventModel = require('../models/eventModel');
const { createResponse, paginate } = require('../utils/helpers');
const UserModel = require('../models/userModel');  
const pool = require('../config/database');  

class EventController {
  /**
   * Get all events with filters and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getEvents(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        search,
        city,
        status = 'approved'
      } = req.query;

      console.log(`🔍 Getting events - Page: ${page}, Limit: ${limit}, Category: ${category}, Search: ${search}`);

      const filters = {
        category_id: category,
        status,
        privacy_type: 'public',
        search,
        city
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const pagination = { 
        page: parseInt(page), 
        limit: parseInt(limit) 
      };

      const result = await EventModel.findMany(filters, pagination);

      const response = createResponse(
        true,
        `Found ${result.events.length} events`,
        result
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get events error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve events. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Get single event by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getEventById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { access_code } = req.query;  // ✅ GET ACCESS CODE FROM QUERY

      console.log(`🎉 Getting event details for ID: ${id}`);

      const event = await EventModel.findById(id, userId);

      if (!event) {
        return res.status(404).json(
          createResponse(false, 'Event not found')
        );
      }

      // Check privacy settings
      // if (event.privacy_type === 'private' && !event.user_role_in_event) {
      //   const isAdmin = ['admin', 'sub_admin'].includes(req.user?.role);

      //   if (!isAdmin) {
      //       return res.status(403).json(
      //       createResponse(false, 'This is a private event. Access denied.')
      //     );
      //   }
      // }

      // ✅ CHECK PRIVATE EVENT ACCESS
      if (event.privacy_type === 'private') {
        const hasAccess = 
          event.user_role_in_event || // Is event member
          ['admin', 'sub_admin'].includes(req.user?.role) || // Is admin
          (access_code && access_code === event.private_access_code); // Has correct access code

        if (!hasAccess) {
          return res.status(403).json(
            createResponse(
              false, 
              'This is a private event. Please provide a valid access code.',
              { requires_access_code: true }
            )
          );
        }
      }

      // Increment view count (don't await to avoid slowing response)
      EventModel.incrementViewCount(id);

      const response = createResponse(
        true,
        'Event details retrieved successfully',
        { event }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get event by ID error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve event details. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Create new event (Organizer only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createEvent(req, res) {
    try {
      console.log("📥 req.body in createEvent:", req.body);
      console.log('📂 req.files:', req.files);
      console.log('🖼️ req.processedImages:', req.processedImages);

      const organizerId = req.user.id;

      const eventData = { 
        ...(req.body || {}),
        ...(req.processedImages || {})
      };


      console.log(`🎪 Creating event: ${eventData.title} by organizer: ${organizerId}`);

      // Validate required fields
      const requiredFields = [
        'title', 'description', 'category_id', 'venue_name', 
        'venue_address', 'venue_city', 'organizer_name'
      ];

      for (const field of requiredFields) {
        if (!eventData[field]) {
          return res.status(400).json(
            createResponse(false, `${field.replace('_', ' ')} is required`)
          );
        }
      }

      const event = await EventModel.create(eventData, organizerId);

      const response = createResponse(
        true,
        'Event created successfully! It will be reviewed by administrators before going live.',
        { event }
      );

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Create event error:', error.message);

      let statusCode = 500;
      let message = 'Failed to create event. Please try again later.';

      if (error.message.includes('category')) {
        statusCode = 400;
        message = 'Invalid category selected';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Update event (Event owner/manager only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = {
      ...(req.body || {}),
      ...(req.processedImages || {})
    };


      console.log(`📝 Updating event ID: ${id} by user: ${userId}`);

      // Remove fields that shouldn't be updated via this endpoint
      const forbiddenFields = ['id', 'organizer_id', 'slug', 'status', 'approved_by', 'approved_at', 'created_at', 'updated_at'];
      forbiddenFields.forEach(field => delete updateData[field]);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json(
          createResponse(false, 'No valid fields provided for update')
        );
      }

      const updatedEvent = await EventModel.update(id, updateData, userId);

      const response = createResponse(
        true,
        'Event updated successfully',
        { event: updatedEvent }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Update event error:', error.message);

      let statusCode = 500;
      let message = 'Failed to update event. Please try again later.';

      if (error.message.includes('Permission denied')) {
        statusCode = 403;
        message = 'You are not authorized to update this event';
      } else if (error.message === 'Event not found') {
        statusCode = 404;
        message = 'Event not found';
      } else if (error.message === 'No valid fields to update') {
        statusCode = 400;
        message = 'No valid fields provided for update';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Delete event (Event owner only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log(`🗑️ Deleting event ID: ${id} by user: ${userId}`);

      await EventModel.delete(id, userId);

      const response = createResponse(
        true,
        'Event deleted successfully'
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Delete event error:', error.message);

      let statusCode = 500;
      let message = 'Failed to delete event. Please try again later.';

      if (error.message.includes('Permission denied')) {
        statusCode = 403;
        message = 'Only event owners can delete events';
      } else if (error.message === 'Event not found') {
        statusCode = 404;
        message = 'Event not found';
      }

      const response = createResponse(false, message);
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get events for current user (organizer dashboard)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getMyEvents(req, res) {
    try {
      const organizerId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      console.log(`📋 Getting events for organizer: ${organizerId}, status filter: ${status || 'ALL'}`);

      // Temporary simple query to avoid complex parameter issues
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
          SELECT 
            e.id, e.title, e.slug, e.short_description, e.status, e.privacy_type,
            e.venue_name, e.venue_city, e.created_at, e.organizer_id,
            c.name as category_name,
            u.first_name || ' ' || u.last_name as organizer_full_name
          FROM events e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN users u ON e.organizer_id = u.id
          WHERE e.organizer_id = $1
          `;

      let queryParams = [organizerId];
      let paramCount = 2;

      if (status && status !== "ALL") {
        query += ` AND e.status = $${paramCount}::event_status`;
        queryParams.push(status);
        paramCount++;
      }

      query += ` ORDER BY e.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(parseInt(limit), offset);

      // Count query
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM events e 
        WHERE e.organizer_id = $1
      `;
      let countParams = [organizerId];

      if (status && status !== "ALL") {
        countQuery += ' AND e.status = $2::event_status';
        countParams.push(status);
      }

      console.log(`📋 Executing query:`, query);
      console.log(`📋 Query params:`, queryParams);

      const [eventsResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, countParams)
      ]);

      const events = eventsResult.rows;
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      console.log(`📋 Found ${events.length} events for organizer`);

      const response = createResponse(
        true,
        `Found ${events.length} of your events`,
        {
          events,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: totalCount,
            per_page: parseInt(limit),
            has_next: page < totalPages,
            has_previous: page > 1
          }
        }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get my events error:', error.message);
      console.error('❌ Get my events stack:', error.stack);
      
      const response = createResponse(
        false,
        `Failed to retrieve your events: ${error.message}`
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Get event categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCategories(req, res) {
    try {
      console.log('📂 Getting event categories');

      const categories = await EventModel.getCategories();

      const response = createResponse(
        true,
        'Categories retrieved successfully',
        { categories }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get categories error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve categories. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Search events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchEvents(req, res) {
    try {
      const { q: search, category, city, page = 1, limit = 12 } = req.query;

      if (!search || search.trim().length < 2) {
        return res.status(400).json(
          createResponse(false, 'Search query must be at least 2 characters long')
        );
      }

      console.log(`🔎 Searching events for: "${search}"`);

      const filters = {
        search: search.trim(),
        status: 'approved',
        privacy_type: 'public',
        ...(category && { category_id: category }),
        ...(city && { city })
      };

      const pagination = { 
        page: parseInt(page), 
        limit: parseInt(limit) 
      };

      const result = await EventModel.findMany(filters, pagination);

      const response = createResponse(
        true,
        `Found ${result.pagination.total_count} events for "${search}"`,
        {
          ...result,
          search_query: search
        }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Search events error:', error.message);
      
      const response = createResponse(
        false,
        'Search failed. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Get featured/trending events
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getFeaturedEvents(req, res) {
    try {
      const { limit = 6 } = req.query;

      console.log('⭐ Getting featured events');

      // Get events sorted by view count and recent activity
      const query = `
        SELECT 
          e.id, e.title, e.slug, e.short_description, e.cover_image, e.thumbnail_image,
          e.venue_name, e.venue_city, e.view_count, e.created_at,
          c.name as category_name,
          c.slug as category_slug,
          u.first_name || ' ' || u.last_name as organizer_name,
          (SELECT MIN(es.start_time) FROM event_sessions es WHERE es.event_id = e.id AND es.is_active = true) as earliest_session,
          (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as min_price,
          (SELECT SUM(tt.total_quantity - tt.sold_quantity) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as available_tickets
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.organizer_id = u.id
        WHERE e.status = 'approved' AND e.privacy_type = 'public'
        ORDER BY e.view_count DESC, e.created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [parseInt(limit)]);

      const events = result.rows.map(event => ({
        ...event,
        min_price: event.min_price ? parseFloat(event.min_price) : null,
        available_tickets: event.available_tickets ? parseInt(event.available_tickets) : 0
      }));

      const response = createResponse(
        true,
        'Featured events retrieved successfully',
        { events }
      );

      res.json(response);

    } catch (error) {
      console.error('❌ Get featured events error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve featured events. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  /**
   * Submit event for approval
   * POST /api/events/:id/submit
   * @access Private (Event Owner)
   */
  static async submitEventForApproval(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log(`📤 Submitting event ${id} for approval`);

      const event = await EventModel.submitForApproval(id, userId);

      res.json(
        createResponse(
          true,
          'Event submitted successfully. It will be reviewed by administrators.',
          { event }
        )
      );

    } catch (error) {
      console.error('❌ Submit for approval error:', error.message);

      let statusCode = 500;
      let message = 'Failed to submit event for approval';

      if (error.message.includes('Only event owner')) {
        statusCode = 403;
        message = error.message;
      } else if (error.message.includes('validation failed') || 
                error.message.includes('Cannot submit')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message === 'Event not found') {
        statusCode = 404;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  /**
   * Get event statistics
   * GET /api/events/:id/statistics
   * @access Private (Event Owner/Manager)
   */
  static async getEventStatistics(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = ['admin', 'sub_admin'].includes(req.user.role);

      if (!isAdmin) {
        const permission = await EventModel.checkPermission(
          id, 
          userId, 
          ['owner', 'manager']
        );

        if (!permission.hasPermission) {
          return res.status(403).json(
            createResponse(false, 'Access denied')
          );
        }
      }

      const stats = await EventModel.getStatistics(id);

      res.json(
        createResponse(
          true,
          'Event statistics retrieved successfully',
          { statistics: stats }
        )
      );

    } catch (error) {
      console.error('❌ Get event statistics error:', error.message);

      let statusCode = 500;
      let message = 'Failed to retrieve event statistics';

      if (error.message === 'Event not found') {
        statusCode = 404;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  /**
   * Get events pending approval (Admin only)
   * GET /api/admin/events/pending
   * @access Private (Admin only)
   */
  static async getPendingEvents(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      console.log(`📋 Admin getting pending events`);

      const result = await EventModel.findPendingApproval({
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json(
        createResponse(
          true,
          `Found ${result.pagination.total_count} events pending approval`,
          result
        )
      );

    } catch (error) {
      console.error('❌ Get pending events error:', error.message);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve pending events')
      );
    }
  }

  /**
   * Approve event (Admin only)
   * POST /api/admin/events/:id/approve
   * @access Private (Admin only)
   */
  static async approveEvent(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      console.log(`✅ Admin ${adminId} approving event ${id}`);

      const event = await EventModel.approve(id, adminId);

      await notificationService.sendEventApproved(event);

      res.json(
        createResponse(
          true,
          'Event approved successfully',
          { event }
        )
      );

    } catch (error) {
      console.error('❌ Approve event error:', error.message);

      let statusCode = 500;
      let message = 'Failed to approve event';

      if (error.message.includes('not pending approval')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message === 'Event not found') {
        statusCode = 404;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  /**
   * Reject event (Admin only)
   * POST /api/admin/events/:id/reject
   * @access Private (Admin only)
   */
  static async rejectEvent(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json(
          createResponse(false, 'Rejection reason is required')
        );
      }

      console.log(`❌ Admin ${adminId} rejecting event ${id}`);

      const event = await EventModel.reject(id, adminId, reason);

      await notificationService.sendEventRejected(event, reason);

      res.json(
        createResponse(
          true,
          'Event rejected successfully',
          { event }
        )
      );

    } catch (error) {
      console.error('❌ Reject event error:', error.message);

      let statusCode = 500;
      let message = 'Failed to reject event';

      if (error.message.includes('Rejection reason')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message.includes('not pending approval')) {
        statusCode = 400;
        message = error.message;
      } else if (error.message === 'Event not found') {
        statusCode = 404;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  /**
   * Get event by slug
   * GET /api/events/slug/:slug
   * @access Public
   */
  static async getEventBySlug(req, res) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      console.log(`Getting event by slug: ${slug}`);
      
      const query = `
        SELECT id FROM events 
        WHERE slug = $1 
        AND status IN ('approved', 'active')
        AND privacy_type = 'public'
      `;
      
      const result = await pool.query(query, [slug]);
      
      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Event not found')
        );
      }

      const eventId = result.rows[0].id;
      req.params.id = eventId;
      
      return EventController.getEventById(req, res);

    } catch (error) {
      console.error('❌ Get event by slug error:', error.message);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve event')
      );
    }
  }

  static async debugMyEvents(req, res) {
    try {
      const organizerId = req.user.id;
            
      console.log(`🔍 Debug my events for organizer: ${organizerId}`);
      
      // Check events created by this organizer
      const eventsQuery = `
        SELECT id, title, status, organizer_id, created_at,
          (SELECT COUNT(*) FROM event_sessions WHERE event_id = e.id) as session_count,
          (SELECT COUNT(*) FROM ticket_types WHERE event_id = e.id) as ticket_count
        FROM events e
        WHERE organizer_id = $1 
        ORDER BY created_at DESC
      `;
      
      const eventsResult = await pool.query(eventsQuery, [organizerId]);
      
      console.log(`📊 Found ${eventsResult.rows.length} events`);
      
      const { createResponse } = require('../utils/helpers');
      res.json(createResponse(true, 'Debug info for my events', {
        organizer_id: organizerId,
        events_count: eventsResult.rows.length,
        events: eventsResult.rows
      }));
      
    } catch (error) {
      console.error('❌ Debug my events error:', error.message);
      const { createResponse } = require('../utils/helpers');
      res.status(500).json(createResponse(false, `Debug error: ${error.message}`));
    }
  }

  static async addEventMember(req, res) {
    try {
      const { eventId } = req.params;
      const { email, role } = req.body;
      const invitedBy = req.user.id;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json(
          createResponse(false, 'User not found with this email')
        );
      }

      // Check if already member
      const existingQuery = await pool.query(
        'SELECT id FROM event_organizer_members WHERE event_id = $1 AND user_id = $2',
        [eventId, user.id]
      );

      if (existingQuery.rows.length > 0) {
        return res.status(409).json(
          createResponse(false, 'User is already a team member')
        );
      }

      // Add member
      const result = await pool.query(`
        INSERT INTO event_organizer_members 
        (event_id, user_id, role, invited_by, accepted_at, is_active)
        VALUES ($1, $2, $3, $4, NOW(), true)
        RETURNING *
      `, [eventId, user.id, role, invitedBy]);

      res.json(createResponse(
        true,
        'Team member added successfully',
        { member: result.rows[0] }
      ));

    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json(createResponse(false, 'Failed to add team member'));
    }
  }

  static async getEventMembers(req, res) {
    try {
      const { eventId } = req.params;

      const result = await pool.query(`
        SELECT 
          eom.*,
          u.email, u.first_name, u.last_name,
          invited.first_name || ' ' || invited.last_name as invited_by_name
        FROM event_organizer_members eom
        JOIN users u ON eom.user_id = u.id
        LEFT JOIN users invited ON eom.invited_by = invited.id
        WHERE eom.event_id = $1 AND eom.is_active = true
        ORDER BY eom.created_at DESC
      `, [eventId]);

      res.json(createResponse(
        true,
        'Team members retrieved successfully',
        { members: result.rows }
      ));

    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json(createResponse(false, 'Failed to get team members'));
    }
  }

  static async removeEventMember(req, res) {
    try {
      const { eventId, memberId } = req.params;

      await pool.query(`
        UPDATE event_organizer_members 
        SET is_active = false, updated_at = NOW()
        WHERE event_id = $1 AND user_id = $2 AND role != 'owner'
      `, [eventId, memberId]);

      res.json(createResponse(true, 'Team member removed successfully'));

    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json(createResponse(false, 'Failed to remove team member'));
    }
  }
}

module.exports = EventController;
