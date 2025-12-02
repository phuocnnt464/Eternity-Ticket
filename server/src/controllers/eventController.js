// src/controllers/eventController.js
const EventModel = require('../models/eventModel');
const { createResponse, paginate } = require('../utils/helpers');
const UserModel = require('../models/userModel');  
const pool = require('../config/database');  
const emailService = require('../services/emailService');
const { IMAGE_CONFIGS } = require('../middleware/uploadMiddleware')

class EventController {
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
      console.error('Get events error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve events. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  static async getEventById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { access_code } = req.query; 

      // console.log(`Getting event details for ID: ${id}`);

      const event = await EventModel.findById(id, userId);

      if (!event) {
        return res.status(404).json(
          createResponse(false, 'Event not found')
        );
      }

      if (event.privacy_type === 'private') {
        const hasAccess = 
          event.user_role_in_event || // Is event member
          ['admin', 'sub_admin'].includes(req.user?.role) || // Is admin
          (access_code && access_code === event.private_access_code); // Has correct access code

        if (!hasAccess) {
          await pool.query(`
            INSERT INTO activity_logs (action, description, ip_address, metadata)
            VALUES ('failed_private_access', 'Failed private event access', $1, $2)
          `, [req.ip, JSON.stringify({ event_id: event.id })]);
          return res.status(403).json(
            createResponse(
              false, 
              'This is a private event. Please provide a valid access code.',
              { requires_access_code: true }
            )
          );
        }
      }

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

  static async createEvent(req, res) {
    try {
      // console.log("req.body in createEvent:", req.body);
      // console.log('req.files:', req.files);
      // console.log('req.processedImages:', req.processedImages);

      const organizerId = req.user.id;

      const eventData = { 
        ...(req.body || {}),
        ...(req.processedImages || {})
      };


      // console.log(`Creating event: ${eventData.title} by organizer: ${organizerId}`);

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
      console.error('Create event error:', error.message);

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

  static async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = {
        ...(req.body || {}),
        ...(req.processedImages || {})
      };


      // console.log(`Updating event ID: ${id} by user: ${userId}`);
      // console.log('Update data received:', JSON.stringify(updateData, null, 2)); 
      // console.log('req.body:', JSON.stringify(req.body, null, 2)); 
      // console.log('req.processedImages:', JSON.stringify(req.processedImages, null, 2)); 

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
      console.error('Update event error:', error.message);

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

  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // console.log(`Deleting event ID: ${id} by user: ${userId}`);

      await EventModel.delete(id, userId);

      const response = createResponse(
        true,
        'Event deleted successfully'
      );

      res.json(response);

    } catch (error) {
      // console.error('Delete event error:', error.message);

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

  static async getMyEvents(req, res) {
    try {
      const organizerId = req.user.id;
      const { page = 1, limit = 10, status, search } = req.query;

      // console.log(`Getting events for organizer: ${organizerId}, status filter: ${status || 'ALL'}`);

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
          SELECT 
            e.id, e.title, e.slug, e.short_description, e.status, e.privacy_type,
            e.venue_name, e.venue_city, e.created_at, e.organizer_id,
            e.start_date, e.end_date,
            e.thumbnail_image, e.logo_image, e.cover_image,
            c.name as category_name,
            u.first_name || ' ' || u.last_name as organizer_full_name,        
            (SELECT COUNT(*) FROM tickets t
              JOIN orders o ON t.order_id = o.id
              WHERE t.event_id = e.id AND o.status = 'paid') as sold_tickets,
            (SELECT COALESCE(SUM(tt.total_quantity), 0)
              FROM ticket_types tt
              WHERE tt.event_id = e.id AND tt.is_active = true) as total_tickets,
            (SELECT COALESCE(SUM(o.total_amount), 0)
              FROM orders o
              WHERE o.event_id = e.id AND o.status = 'paid') as revenue,
            (SELECT COALESCE(SUM(tt.total_quantity - tt.sold_quantity), 0)
              FROM ticket_types tt
              WHERE tt.event_id = e.id 
                AND tt.is_active = true
                AND (tt.sale_start_time IS NULL OR tt.sale_start_time <= NOW())
                AND (tt.sale_end_time IS NULL OR tt.sale_end_time > NOW())
            ) as available_tickets
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

      if (search && search.trim()) {
        query += ` AND (
          LOWER(e.title) LIKE LOWER($${paramCount}) OR 
          LOWER(e.venue_name) LIKE LOWER($${paramCount + 1})
        )`;
        queryParams.push(`%${search}%`, `%${search}%`);
        paramCount += 2;
      }

      query += ` ORDER BY e.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(parseInt(limit), offset);

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM events e 
        WHERE e.organizer_id = $1
      `;
      let countParams = [organizerId];
      let countParamCount = 2;

      if (status && status !== "ALL") {
        countQuery += ` AND e.status = $${countParamCount}::event_status`;
        countParams.push(status);
        countParamCount++;
      }

      if (search && search.trim()) {
        countQuery += ` AND (
          LOWER(e.title) LIKE LOWER($${countParamCount}) OR 
          LOWER(e.venue_name) LIKE LOWER($${countParamCount + 1})
        )`;
        countParams.push(`%${search}%`, `%${search}%`);
      }

      // console.log(`Executing query:`, query);
      // console.log(`Query params:`, queryParams);

      const [eventsResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, countParams)
      ]);

      const events = eventsResult.rows;
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      // console.log(`Found ${events.length} events for organizer`);

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
      // console.error('Get my events error:', error.message);
      // console.error('Get my events stack:', error.stack);
      
      const response = createResponse(
        false,
        `Failed to retrieve your events: ${error.message}`
      );
      
      res.status(500).json(response);
    }
  }

  static async getCategories(req, res) {
    try {
      // console.log('Getting event categories');

      const categories = await EventModel.getCategories();

      const response = createResponse(
        true,
        'Categories retrieved successfully',
        { categories }
      );

      res.json(response);

    } catch (error) {
      // console.error('Get categories error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve categories. Please try again later.'
      );
      
      res.status(500).json(response);
    }
  }

  static async searchEvents(req, res) {
    try {
      const { q: search, category, city, page = 1, limit = 12 } = req.query;

      if (!search || search.trim().length < 2) {
        return res.status(400).json(
          createResponse(false, 'Search query must be at least 2 characters long')
        );
      }

      // console.log(`Searching events for: "${search}"`);

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
      // console.error('Search events error:', error.message);
      
      const response = createResponse(
        false,
        'Search failed'
      );
      
      res.status(500).json(response);
    }
  }

  static async getFeaturedEvents(req, res) {
    try {
      const { limit = 6 } = req.query;

      // console.log('Getting featured events');

      const query = `
        SELECT 
          e.id, e.title, e.slug, e.short_description, e.cover_image, e.thumbnail_image,
          e.venue_name, e.venue_city, 
          e.start_date,  
          e.end_date,  
          e.view_count, e.created_at,
          e.status, 
          c.name as category_name,
          c.slug as category_slug,
          u.first_name || ' ' || u.last_name as organizer_name,
          (SELECT MIN(es.start_time) FROM event_sessions es WHERE es.event_id = e.id AND es.is_active = true) as earliest_session,
          (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as min_price,
          (SELECT SUM(tt.total_quantity - tt.sold_quantity) 
            FROM ticket_types tt WHERE tt.event_id = e.id 
              AND tt.is_active = true
              AND (tt. sale_start_time IS NULL OR tt. sale_start_time <= NOW())  
              AND (tt. sale_end_time IS NULL OR tt.sale_end_time > NOW())
            ) as available_tickets,
          (SELECT COUNT(*) FROM tickets t
          JOIN orders o ON t.order_id = o.id
          WHERE t.event_id = e.id AND o.status = 'paid') as total_tickets_sold 
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
      // console.error('Get featured events error:', error.message);
      
      const response = createResponse(
        false,
        'Failed to retrieve featured events'
      );
      
      res.status(500).json(response);
    }
  }

  static async submitEventForApproval(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // console.log(`Submitting event ${id} for approval`);

      const event = await EventModel.submitForApproval(id, userId);

      res.json(
        createResponse(
          true,
          'Event submitted successfully. It will be reviewed by administrators.',
          { event }
        )
      );

    } catch (error) {
      console.error('Submit for approval error:', error.message);

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
      console.error('Get event statistics error:', error.message);

      let statusCode = 500;
      let message = 'Failed to retrieve event statistics';

      if (error.message === 'Event not found') {
        statusCode = 404;
        message = error.message;
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  static async getOrganizerStats(req, res) {
    try {
      const organizerId = req.user.id;
      
      // console.log(`Getting stats for organizer: ${organizerId}`);
      
      const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'approved') as approved_events,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_events,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_events,
          COUNT(*) as total_events,
          COALESCE(SUM(
            (SELECT COUNT(*) 
            FROM tickets t
            JOIN orders o ON t.order_id = o.id
            WHERE t.event_id = events.id
            AND o.status = 'paid' )
          ), 0) as total_tickets_sold,
          COALESCE(SUM(
            (SELECT COALESCE(SUM(total_amount), 0) 
            FROM orders 
            WHERE orders.event_id = events.id AND orders.status = 'paid')
          ), 0) as total_revenue
        FROM events
        WHERE organizer_id = $1
      `;
      
      const result = await pool.query(statsQuery, [organizerId]);
      const stats = result.rows[0];
      
      res.json({
        success: true,
        message: 'Organizer statistics retrieved successfully',
        data: {
          approved_events: parseInt(stats.approved_events) || 0,
          pending_events: parseInt(stats.pending_events) || 0,
          draft_events: parseInt(stats.draft_events) || 0,
          total_events: parseInt(stats.total_events) || 0,
          total_tickets_sold: parseInt(stats.total_tickets_sold) || 0,
          total_revenue: parseFloat(stats.total_revenue) || 0
        }
      });
      
    } catch (error) {
      console.error('Get organizer stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organizer statistics'
      });
    }
  }

  static async getPendingEvents(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      // console.log(`Admin getting pending events`);

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
      console.error('Get pending events error:', error.message);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve pending events')
      );
    }
  }

  static async approveEvent(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // console.log(`Admin ${adminId} approving event ${id}`);

      const event = await EventModel.approve(id, adminId);

      const organizerQuery = `
        SELECT u.email, u.first_name || ' ' || u.last_name as organizer_name
        FROM users u
        WHERE u.id = $1
      `;

      const organizerResult = await pool.query(organizerQuery, [event.organizer_id]);
      
      if (organizerResult.rows.length > 0) {
        const organizer = organizerResult.rows[0];
        
        try {
          await emailService.sendEventApproved({
            organizer_email: organizer.email,
            organizer_name: organizer.organizer_name,
            event_title: event.title,
            event_id: event.id
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }

      try {
        const NotificationModel = require('../models/notificationModel');
        await NotificationModel.create({
          user_id: event.organizer_id,
          type: 'system',
          title: 'Event Approved',
          content: `Your event "${event.title}" has been approved and is now live!`,
          event_id: event.id
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      res.json(
        createResponse(
          true,
          'Event approved successfully',
          { event }
        )
      );

    } catch (error) {
      console.error('Approve event error:', error.message);

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

      // console.log(`Admin ${adminId} rejecting event ${id}`);

      const event = await EventModel.reject(id, adminId, reason);

      const organizerQuery = `
        SELECT u.email, u.first_name || ' ' || u.last_name as organizer_name
        FROM users u
        WHERE u.id = $1
      `;

      const organizerResult = await pool.query(organizerQuery, [event.organizer_id]);

      if (organizerResult.rows.length > 0) {
        const organizer = organizerResult.rows[0];
        
        try {
          await emailService.sendEventRejected({
            organizer_email: organizer.email,
            organizer_name: organizer.organizer_name,
            event_title: event.title,
            rejection_reason: reason
          });
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }

      try {
        const NotificationModel = require('../models/notificationModel');
        await NotificationModel.create({
          user_id: event.organizer_id,
          type: 'system',
          title: 'Event Rejected',
          content: `Your event "${event.title}" was not approved. Reason: ${reason}`,
          event_id: event.id
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      res.json(
        createResponse(
          true,
          'Event rejected successfully',
          { event }
        )
      );

    } catch (error) {
      console.error('Reject event error:', error.message);

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

  static async getEventBySlug(req, res) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // console.log(`Getting event by slug: ${slug}`);

      const query = `
        SELECT 
          id, 
          status, 
          privacy_type, 
          organizer_id,
          title,
          rejection_reason
        FROM events 
        WHERE slug = $1
      `;
      
      const result = await pool.query(query, [slug]);
      
      if (result.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Event not found')
        );
      }

      const eventData = result.rows[0];
    
      const isAdmin = ['admin', 'sub_admin'].includes(userRole);
      const isOrganizer = userId && eventData.organizer_id === userId;
      const isPublicApproved = ['approved', 'active'].includes(eventData.status) 
                              && eventData.privacy_type === 'public';
      
      if (!isPublicApproved) {        
        if (!userId) {
          return res.status(401).json(
            createResponse(false, 'Please login to view this event')
          );
        }
        
        if (!isOrganizer && !isAdmin) {
          const statusMessages = {
            'draft': 'This event is still in draft mode',
            'pending_approval': 'This event is pending approval',
            'rejected': 'This event has been rejected',
            'cancelled': 'This event has been cancelled'
          };
          
          return res.status(403).json(
            createResponse(
              false, 
              statusMessages[eventData.status] || 'This event is not available',
              { 
                status: eventData.status,
                canEdit: false
              }
            )
          );
        }
      }
      
      const eventId = eventData.id;
      req.params.id = eventId;
      
      return EventController.getEventById(req, res);

    } catch (error) {
      console.error('Get event by slug error:', error.message);
      res.status(500).json(
        createResponse(false, 'Failed to retrieve event')
      );
    }
  }

  static async debugMyEvents(req, res) {
    try {
      const organizerId = req.user.id;
            
      console.log(`Debug my events for organizer: ${organizerId}`);
      
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
      
      console.log(`Found ${eventsResult.rows.length} events`);
      
      res.json(createResponse(true, 'Debug info for my events', {
        organizer_id: organizerId,
        events_count: eventsResult.rows.length,
        events: eventsResult.rows
      }));
      
    } catch (error) {
      console.error('Debug my events error:', error.message);
      res.status(500).json(createResponse(false, `Debug error: ${error.message}`));
    }
  }

  static async addEventMember(req, res) {
    try {
      const { eventId } = req.params;
      const { email, role } = req.body;
      const invitedBy = req.user.id;

      // console.log(`Adding/inviting member to event ${eventId}: ${email}`);

      const user = await UserModel.findByEmail(email);

      if (user) {
        // console.log(`User found: ID ${user.id}, Email: ${user.email}`);
        const existingQuery = await pool.query(
          'SELECT id FROM event_organizer_members WHERE event_id = $1 AND user_id = $2',
          [eventId, user.id]
        );

        if (existingQuery.rows.length > 0) {
          return res.status(409).json(
            createResponse(false, 'User is already a team member')
          );
        }

        const result = await pool.query(`
          INSERT INTO event_organizer_members 
          (event_id, user_id, role, invited_by, accepted_at, is_active)
          VALUES ($1, $2, $3, $4, NOW(), true)
          RETURNING *
        `, [eventId, user.id, role, invitedBy]);

        res.json(createResponse(
          true,
          'Team member added successfully',
          { 
            member: result.rows[0],
            type: 'direct_add'
          }
        ));
      } else {
        // console.log(`User not found, sending invitation email`);
        
        const existingInvite = await pool.query(
          'SELECT id, status FROM event_invitations WHERE event_id = $1 AND email = $2',
          [eventId, email]
        );

        if (existingInvite.rows.length > 0) {
          const invite = existingInvite.rows[0];
          if (invite.status === 'pending') {
            return res.status(409).json(
              createResponse(false, 'An invitation has already been sent to this email')
            );
          } else if (invite.status === 'accepted') {
            return res.status(409).json(
              createResponse(false, 'User has already accepted an invitation')
            );
          }
        }

        const crypto = require('crypto');
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

        const invitation = await pool.query(`
          INSERT INTO event_invitations 
          (event_id, email, role, invited_by, invitation_token, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [eventId, email, role, invitedBy, invitationToken, expiresAt]);

        const eventResult = await pool.query(
          'SELECT title, slug FROM events WHERE id = $1',
          [eventId]
        );
        const event = eventResult.rows[0];

        const emailService = require('../services/emailService');
        await emailService.sendEventInvitation({
          email,
          event_title: event.title,
          inviter_name: `${req.user.first_name} ${req.user.last_name}`,
          role,
          invitation_token: invitationToken
        });

        return res.json(createResponse(
          true,
          'Invitation sent successfully. User will be added when they accept.',
          { 
            invitation: invitation.rows[0],
            type: 'invitation_sent'
          }
        ));
      }
    } catch (error) {
      console.error('Add/invite member error:', error);
      res.status(500).json(createResponse(false, 'Failed to add team member'));
    }
  }

  static async acceptInvitation(req, res) {
    try {
      const { token } = req.params;
      const userId = req.user.id;

      // Find invitation
      const inviteResult = await pool.query(`
        SELECT i.*, e.title as event_title
        FROM event_invitations i
        JOIN events e ON i.event_id = e.id
        WHERE i.invitation_token = $1 
        AND i.status = 'pending'
        AND i.expires_at > NOW()
      `, [token]);

      if (inviteResult.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Invitation not found or expired')
        );
      }

      const invitation = inviteResult.rows[0];

      if (invitation.email !== req.user.email) {
        return res.status(403).json(
          createResponse(false, 'This invitation is for a different email address')
        );
      }

      const memberResult = await pool.query(`
        INSERT INTO event_organizer_members 
        (event_id, user_id, role, invited_by, accepted_at, is_active)
        VALUES ($1, $2, $3, $4, NOW(), true)
        RETURNING *
      `, [invitation.event_id, userId, invitation.role, invitation.invited_by]);

      await pool.query(`
        UPDATE event_invitations 
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = $1
      `, [invitation.id]);

      res.json(createResponse(
        true,
        'Successfully joined event team',
        { 
          member: memberResult.rows[0],
          event_title: invitation.event_title
        }
      ));

    } catch (error) {
      console.error('❌ Accept invitation error:', error);
      res.status(500).json(createResponse(false, 'Failed to accept invitation'));
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

  static async getTeams(req, res) {
    try {
      const query = `
        SELECT 
          e.id,
          e.title,
          e. slug,
          e.start_date,
          e.end_date,
          e.venue_name,
          e.venue_city,
          e.status,
          e.cover_image,
          eom.role as member_role,
          eom.invited_at as added_at,  
          eom.accepted_at,
          o.id as owner_id,
          o.first_name as owner_first_name,
          o.last_name as owner_last_name,
          o.email as owner_email
        FROM event_organizer_members eom
        JOIN events e ON eom. event_id = e.id
        JOIN users o ON e.organizer_id = o.id
        WHERE eom.user_id = $1 
          AND eom.is_active = true
          AND e.status IN ('approved') 
        ORDER BY eom.invited_at DESC
      `;
      
      const result = await pool.query(query, [req.user.id]);

      return res.json({
        success: true,
        data: {
          events: result.rows
        }
      });
    } catch (error) {
      console.error('Get team events error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get team events'
      });
    }
  }

  static async removeEventMember(req, res) {
    try {
      const { eventId, userId } = req.params;

      await pool.query(`
        UPDATE event_organizer_members 
        SET is_active = false, updated_at = NOW()
        WHERE event_id = $1 AND user_id = $2 AND role != 'owner'
      `, [eventId, userId]);

      res.json(createResponse(true, 'Team member removed successfully'));

    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json(createResponse(false, 'Failed to remove team member'));
    }
  }

  static async updateMemberRole(req, res) {
    try {
      const { eventId, userId } = req.params;
      const { role } = req.body;

      // console.log(`Updating member role: Event ${eventId}, Member ${userId}, New Role: ${role}`);

      // Validate role
      const validRoles = ['owner', 'manager', 'checkin_staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json(
          createResponse(false, `Invalid role. Must be one of: ${validRoles.join(', ')}`)
        );
      }

      const checkQuery = await pool.query(`
        SELECT id, role, user_id 
        FROM event_organizer_members 
        WHERE event_id = $1 AND user_id = $2 AND is_active = true
      `, [eventId, userId]);

      if (checkQuery.rows.length === 0) {
        return res.status(404).json(
          createResponse(false, 'Team member not found or inactive')
        );
      }

      const currentRole = checkQuery.rows[0].role;

      if (currentRole === 'owner') {
        return res.status(403).json(
          createResponse(false, 'Cannot change the owner role')
        );
      }

      if (role === 'owner') {
        return res.status(403).json(
          createResponse(false, 'Cannot assign owner role. There can only be one owner per event.')
        );
      }

      const result = await pool.query(`
        UPDATE event_organizer_members 
        SET role = $3, updated_at = NOW()
        WHERE event_id = $1 AND user_id = $2 AND is_active = true
        RETURNING 
          id, event_id, user_id, role, 
          created_at, updated_at, is_active
      `, [eventId, userId, role]);

      const memberDetails = await pool.query(`
        SELECT 
          eom.*,
          u.email, u.first_name, u.last_name
        FROM event_organizer_members eom
        JOIN users u ON eom.user_id = u.id
        WHERE eom.id = $1
      `, [result.rows[0].id]);

      res.json(createResponse(
        true,
        `Team member role updated from "${currentRole}" to "${role}"`,
        { member: memberDetails.rows[0] }
      ));

    } catch (error) {
      console.error('Update member role error:', error);
      
      let statusCode = 500;
      let message = 'Failed to update team member role';

      if (error.code === '23503') {
        statusCode = 404;
        message = 'Event or member not found';
      }

      res.status(statusCode).json(createResponse(false, message));
    }
  }

  static async getImageRequirements(req, res) {
    const requirements = {
      event_cover: {
        recommended_size: `${IMAGE_CONFIGS.event_cover.width}x${IMAGE_CONFIGS.event_cover.height}`,
        max_file_size: '2MB',
        formats: ['PNG', 'JPEG', 'WebP'],
        description: 'Event cover image (1280x720) - will be automatically resized',
        fit: IMAGE_CONFIGS.event_cover.fit,
        quality: IMAGE_CONFIGS.event_cover.quality
      },
      event_thumbnail: {
        recommended_size: `${IMAGE_CONFIGS.event_thumbnail.width}x${IMAGE_CONFIGS.event_thumbnail.height}`,
        max_file_size: '2MB',
        formats: ['PNG', 'JPEG', 'WebP'],
        description: 'Event thumbnail for listings (720x958)',
        fit: IMAGE_CONFIGS.event_thumbnail.fit,
        quality: IMAGE_CONFIGS.event_thumbnail.quality
      },
      event_logo: {
        recommended_size: `${IMAGE_CONFIGS.event_logo.width}x${IMAGE_CONFIGS.event_logo.height}`,
        max_file_size: '2MB',
        formats: ['PNG', 'JPEG', 'WebP'],
        description: 'Event logo (275x275) - square image',
        fit: IMAGE_CONFIGS.event_logo.fit,
        quality: IMAGE_CONFIGS.event_logo.quality
      },
      venue_map: {
        recommended_size: `${IMAGE_CONFIGS.venue_map.width}x${IMAGE_CONFIGS.venue_map.height}`,
        max_file_size: '2MB',
        formats: ['PNG', 'JPEG', 'WebP'],
        description: 'Venue seating map (1920x1080)',
        fit: IMAGE_CONFIGS.venue_map.fit,
        quality: IMAGE_CONFIGS.venue_map.quality
      }
    };

    res.json(createResponse(
      true,
      'Image requirements retrieved',
      requirements
    ));
  }

  static async getEventOrders(req, res) {
    try {
      const { id: eventId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          o.id, o.order_number, o.total_amount, o.status, o.payment_method,
          o.created_at, o.paid_at,
          u.first_name, u.last_name, u.email,
          COUNT(t.id) as ticket_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN tickets t ON o.id = t.order_id
        WHERE o.event_id = $1
      `;

      const params = [eventId];
      let paramCount = 2;

      if (status) {
        query += ` AND o.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      query += ` GROUP BY o.id, u.id ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(parseInt(limit), offset);

      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total 
        FROM orders o 
        WHERE o.event_id = $1 ${status ? 'AND o.status = $2' : ''}
      `;
      const countParams = status ? [eventId, status] : [eventId];

      const [ordersResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      res.json(createResponse(true, 'Event orders retrieved', {
        orders: ordersResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: totalCount,
          per_page: parseInt(limit)
        }
      }));

    } catch (error) {
      console.error('Get event orders error:', error);
      res.status(500).json(createResponse(false, 'Failed to get event orders'));
    }
  }

  static async getAttendees(req, res) {
    try {
      const { id: eventId } = req.params;
      const { page = 1, limit = 50, session_id, checked_in } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          t.id, t.ticket_code, t.ticket_type_name, t.price,
          t.attendee_name, t.attendee_email, t.attendee_phone,
          t.check_in_status, t.checked_in_at,
          es.session_name, es.start_time,
          o.order_number, o.created_at as order_date,
          u.first_name as buyer_first_name, u.last_name as buyer_last_name
        FROM tickets t
        JOIN orders o ON t.order_id = o.id
        JOIN users u ON o.user_id = u.id
        LEFT JOIN event_sessions es ON t.session_id = es.id
        WHERE t.event_id = $1 AND o.status = 'completed'
      `;

      const params = [eventId];
      let paramCount = 2;

      if (session_id) {
        query += ` AND t.session_id = $${paramCount}`;
        params.push(session_id);
        paramCount++;
      }

      if (checked_in !== undefined) {
        const isCheckedIn = checked_in === 'true';
        query += ` AND t.check_in_status = $${paramCount}`;
        params.push(isCheckedIn ? 'checked_in' : 'not_checked_in');
        paramCount++;
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(parseInt(limit), offset);

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM tickets t
        JOIN orders o ON t.order_id = o.id
        WHERE t.event_id = $1 AND o.status = 'completed'
        ${session_id ? `AND t.session_id = $2` : ''}
        ${checked_in !== undefined ? `AND t.check_in_status = $${session_id ? 3 : 2}` : ''}
      `;
      
      const countParams = [eventId];
      if (session_id) countParams.push(session_id);
      if (checked_in !== undefined) {
        countParams.push(checked_in === 'true' ? 'checked_in' : 'not_checked_in');
      }

      const [attendeesResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      res.json(createResponse(true, 'Attendees retrieved', {
        attendees: attendeesResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: totalCount,
          per_page: parseInt(limit)
        }
      }));

    } catch (error) {
      console.error('Get attendees error:', error);
      res.status(500).json(createResponse(false, 'Failed to get attendees'));
    }
  }

  static async getPublicSettings(req, res) {
    try {
      // console.log('Getting public system settings');

      const query = `
        SELECT 
          setting_key, 
          setting_value, 
          description
        FROM system_settings
        WHERE is_public = true
        ORDER BY setting_key
      `;
      
      const result = await pool.query(query);
      
      res.json(createResponse(
        true,
        'Public settings retrieved successfully',
        { settings: result.rows }
      ));
    } catch (error) {
      console.error('Get public settings error:', error);
      res.status(500).json(createResponse(false, 'Failed to retrieve settings'));
    }
  }
}

module.exports = EventController;
