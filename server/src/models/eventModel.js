// src/models/eventModel.js
const pool = require('../config/database');
const { generateSlug } = require('../utils/helpers');

class EventModel {
  /**
   * Create new event
   * @param {Object} eventData - Event data
   * @param {String} organizerId - Organizer user ID
   * @returns {Object} Created event
   */
  static async create(eventData, organizerId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        title,
        description,
        short_description,
        category_id,
        venue_name,
        venue_address,
        venue_city,
        organizer_name,
        organizer_description,
        organizer_contact_email,
        organizer_contact_phone,
        privacy_type = 'public',
        terms_and_conditions,
        additional_info = {},
        cover_image,
        thumbnail_image,
        logo_image,
        venue_map_image
      } = eventData;

      // Generate unique slug
      let slug = generateSlug(title);
      let slugExists = true;
      let counter = 1;

      while (slugExists) {
        const slugCheckQuery = 'SELECT id FROM events WHERE slug = $1';
        const slugResult = await client.query(slugCheckQuery, [slug]);
        
        if (slugResult.rows.length === 0) {
          slugExists = false;
        } else {
          slug = `${generateSlug(title)}-${counter}`;
          counter++;
        }
      }

      const eventQuery = `
        INSERT INTO events (
          organizer_id, category_id, title, slug, description, short_description,
          venue_name, venue_address, venue_city, organizer_name, organizer_description,
          organizer_contact_email, organizer_contact_phone, privacy_type,
          terms_and_conditions, additional_info, status,
          cover_image, thumbnail_image, logo_image, venue_map_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;

      const eventValues = [
        organizerId, category_id, title, slug, description, short_description,
        venue_name, venue_address, venue_city, organizer_name, organizer_description,
        organizer_contact_email, organizer_contact_phone, privacy_type,
        terms_and_conditions, JSON.stringify(additional_info), 'draft',
        cover_image || null,
        thumbnail_image || null,
        logo_image || null,
        venue_map_image || null
      ];

      const eventResult = await client.query(eventQuery, eventValues);
      const event = eventResult.rows[0];

      console.log(`✅ Event created successfully:`, {
        id: event.id,
        title: event.title,
        status: event.status,
        organizer_id: event.organizer_id
      });

      // Add organizer as owner to event_organizer_members
      const memberQuery = `
        INSERT INTO event_organizer_members (event_id, user_id, role, invited_by, accepted_at, is_active)
        VALUES ($1, $2, 'owner', $2, NOW(), true)
      `;
      
      await client.query(memberQuery, [event.id, organizerId]);

      await client.query('COMMIT');

      console.log(`✅ Event created: ${event.title} (ID: ${event.id})`);
      return event;

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create event: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get event by ID with full details
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID (optional, for permission checks)
   * @returns {Object|null} Event with details
   */
  static async findById(eventId, userId = null) {
    try {
      const query = `
        SELECT 
          e.*,
          c.name as category_name,
          c.slug as category_slug,
          u.first_name || ' ' || u.last_name as organizer_full_name,
          u.email as organizer_email,
          CASE WHEN eom.user_id = $2 THEN eom.role ELSE NULL END as user_role_in_event,
          (SELECT COUNT(*) FROM event_sessions WHERE event_id = e.id AND is_active = true) as session_count,
          (SELECT COUNT(*) FROM ticket_types WHERE event_id = e.id AND is_active = true) as ticket_type_count
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.organizer_id = u.id
        LEFT JOIN event_organizer_members eom ON e.id = eom.event_id AND eom.user_id = $2 AND eom.is_active = true
        WHERE e.id = $1
      `;

      const result = await pool.query(query, [eventId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const event = result.rows[0];

      // Parse JSON fields
      if (event.additional_info && typeof event.additional_info === 'string') {
        try {
          event.additional_info = JSON.parse(event.additional_info);
        } catch (error) {
          console.warn('Failed to parse additional_info: ', error);
        }
      }
      if (event.payment_account_info && typeof event.payment_account_info === 'string') {
        event.payment_account_info = JSON.parse(event.payment_account_info);
      }

      return event;

    } catch (error) {
      throw new Error(`Failed to find event: ${error.message}`);
    }
  }

  /**
   * Get events with filters and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Object} Events list with pagination info
   */
  static async findMany(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      const {
        category_id,
        status,
        privacy_type,
        search,
        organizer_id,
        city
      } = filters;

      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      console.log(`🔍 EventModel.findMany called with filters:`, filters);

      // Build WHERE conditions
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 1;

      // Only add status filter if explicitly provided
      if (!status && !organizer_id) {
        // Public listing - only show active events
        whereConditions.push(`e.status = 'active'`);
      } else if (status) {
        // Explicit status filter
        whereConditions.push(`e.status = $${paramCount}`);
        queryParams.push(status);
        paramCount++;
      }

      if (privacy_type) {
        whereConditions.push(`e.privacy_type = $${paramCount}`);
        queryParams.push(privacy_type);
        paramCount++;
      }

      if (category_id) {
        whereConditions.push(`e.category_id = $${paramCount}`);
        queryParams.push(category_id);
        paramCount++;
      }

      if (organizer_id) {
        whereConditions.push(`e.organizer_id = $${paramCount}`);
        queryParams.push(organizer_id);
        paramCount++;
        console.log(`📋 Filtering by organizer_id: ${organizer_id}`);
      }

      if (city) {
        whereConditions.push(`LOWER(e.venue_city) LIKE LOWER($${paramCount})`);
        queryParams.push(`%${city}%`);
        paramCount++;
      }

      if (search) {
        whereConditions.push(`(
          LOWER(e.title) LIKE LOWER($${paramCount}) OR 
          LOWER(e.description) LIKE LOWER($${paramCount + 1}) OR
          LOWER(e.organizer_name) LIKE LOWER($${paramCount + 2})
        )`);
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        paramCount += 3;
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      console.log(`🔍 Generated WHERE clause: ${whereClause}`);
      console.log(`🔍 Query parameters:`, queryParams);

      // Main query
      const eventsQuery = `
        SELECT 
          e.id, e.title, e.slug, e.short_description, e.cover_image, e.thumbnail_image,
          e.venue_name, e.venue_city, e.status, e.privacy_type, e.view_count,
          e.created_at, e.organizer_id,
          c.name as category_name,
          c.slug as category_slug,
          u.first_name || ' ' || u.last_name as organizer_name,
          (SELECT MIN(es.start_time) FROM event_sessions es WHERE es.event_id = e.id AND es.is_active = true) as earliest_session,
          (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as min_price,
          (SELECT MAX(tt.price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as max_price,
          (SELECT SUM(tt.total_quantity) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as total_tickets,
          (SELECT SUM(tt.sold_quantity) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as sold_tickets
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN users u ON e.organizer_id = u.id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT ${paramCount} OFFSET ${paramCount + 1}
      `;

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM events e
        ${whereClause}
      `;

      queryParams.push(limit, offset);
      const countParams = queryParams.slice(0, -2); // Remove limit and offset for count

      console.log(`🔍 Executing main query with ${queryParams.length} parameters`);
      console.log(`🔍 Executing count query with ${countParams.length} parameters`);

      const [eventsResult, countResult] = await Promise.all([
        pool.query(eventsQuery, queryParams),
        pool.query(countQuery, countParams)
      ]);

      console.log(`📊 Query results: ${eventsResult.rows.length} events found`);

      const events = eventsResult.rows.map(event => ({
        ...event,
        min_price: event.min_price ? parseFloat(event.min_price) : null,
        max_price: event.max_price ? parseFloat(event.max_price) : null,
        total_tickets: event.total_tickets ? parseInt(event.total_tickets) : 0,
        sold_tickets: event.sold_tickets ? parseInt(event.sold_tickets) : 0,
        availability_status: this.getAvailabilityStatus(event)
      }));

      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        events,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: limit,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      };

    } catch (error) {
      console.error('❌ EventModel.findMany error:', error.message);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
  }

  /**
 * Update event
 * @param {String} eventId - Event ID
 * @param {Object} updateData - Data to update
 * @param {String} userId - User ID (for permission check)
 * @returns {Object} Updated event
 */
static async update(eventId, updateData, userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user has permission to update event
    const permissionQuery = `
      SELECT eom.role 
      FROM event_organizer_members eom
      WHERE eom.event_id = $1 AND eom.user_id = $2 AND eom.is_active = true
      AND eom.role IN ('owner', 'manager')
    `;

    const permissionResult = await client.query(permissionQuery, [eventId, userId]);
    
    if (permissionResult.rows.length === 0) {
      throw new Error('Permission denied: You are not authorized to update this event');
    }

    // Build update query
    const allowedFields = [
      'title', 'description', 'short_description', 'category_id',
      'venue_name', 'venue_address', 'venue_city', 'organizer_name',
      'organizer_description', 'organizer_contact_email', 'organizer_contact_phone',
      'terms_and_conditions', 'additional_info', 'cover_image', 'thumbnail_image',
      'logo_image', 'venue_map_image'
    ];

    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (!allowedFields.includes(key) || updateData[key] === undefined) return;

      let value = updateData[key];

      // Xử lý additional_info (phải là JSON object)
      if (key === 'additional_info') {
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value); // Parse nếu là string
          } catch {
            value = { note: value }; // Wrap vào object nếu parse fail
          }
        }
        value = JSON.stringify(value); // Stringify để lưu vào DB
      } 
      // Xử lý image fields - lấy path nếu là object
      else if (['cover_image', 'thumbnail_image', 'logo_image', 'venue_map_image'].includes(key)) {
        // Nếu multer upload trả về object có path
        if (value && typeof value === 'object' && value.path) {
          value = value.path;
        }
        // Nếu là object nhưng không có path thì stringify
        else if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        // Nếu là string thì giữ nguyên (đường dẫn file)
      }
      // Các field khác
      else {
        // Tránh lưu "[object Object]" vào DB
        if (typeof value === 'object' && value !== null) {
          console.warn(`⚠️ Field ${key} is object, converting to JSON string`);
          value = JSON.stringify(value);
        }
      }

      fieldsToUpdate.push(`${key} = $${paramCount}`);
      values.push(value);
      console.log(`🔧 Updating field ${key}:`, value);
      paramCount++;
    });

    if (fieldsToUpdate.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Update slug if title changed
    if (updateData.title) {
      let newSlug = generateSlug(updateData.title);
      let slugExists = true;
      let counter = 1;

      while (slugExists) {
        const slugCheckQuery = 'SELECT id FROM events WHERE slug = $1 AND id != $2';
        const slugResult = await client.query(slugCheckQuery, [newSlug, eventId]);
        
        if (slugResult.rows.length === 0) {
          slugExists = false;
        } else {
          newSlug = `${generateSlug(updateData.title)}-${counter}`;
          counter++;
        }
      }

      fieldsToUpdate.push(`slug = $${paramCount}`);
      values.push(newSlug);
      paramCount++;
    }

    values.push(eventId); // Add eventId as last parameter

    const updateQuery = `
      UPDATE events 
      SET ${fieldsToUpdate.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log(`📝 Executing update query with ${values.length} parameters`);
    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error('Event not found');
    }

    await client.query('COMMIT');

    const updatedEvent = result.rows[0];
    
    // Parse JSON fields for response
    if (updatedEvent.additional_info && typeof updatedEvent.additional_info === 'string') {
      try {
        updatedEvent.additional_info = JSON.parse(updatedEvent.additional_info);
      } catch {
        console.warn('⚠️ Failed to parse additional_info');
      }
    }

    console.log(`✅ Event updated: ${updatedEvent.title} (ID: ${updatedEvent.id})`);
    return updatedEvent;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update event error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}


  /**
   * Delete event (soft delete - set status to cancelled)
   * @param {String} eventId - Event ID
   * @param {String} userId - User ID (for permission check)
   * @returns {Boolean} Success status
   */
  static async delete(eventId, userId) {
    try {
      // Check if user is owner
      const permissionQuery = `
        SELECT eom.role 
        FROM event_organizer_members eom
        WHERE eom.event_id = $1 AND eom.user_id = $2 AND eom.is_active = true
        AND eom.role = 'owner'
      `;

      const permissionResult = await pool.query(permissionQuery, [eventId, userId]);
      
      if (permissionResult.rows.length === 0) {
        throw new Error('Permission denied: Only event owners can delete events');
      }

      // Soft delete - set status to cancelled
      const deleteQuery = `
        UPDATE events 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING title
      `;

      const result = await pool.query(deleteQuery, [eventId]);

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      console.log(`🗑️ Event deleted: ${result.rows[0].title} (ID: ${eventId})`);
      return true;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Increment view count
   * @param {String} eventId - Event ID
   */
  static async incrementViewCount(eventId) {
    try {
      const query = `
        UPDATE events 
        SET view_count = view_count + 1 
        WHERE id = $1
      `;

      await pool.query(query, [eventId]);
    } catch (error) {
      // Don't throw error for view count issues
      console.error('Failed to increment view count:', error.message);
    }
  }

  /**
   * Get availability status for event
   * @param {Object} event - Event object
   * @returns {String} Availability status
   */
  static getAvailabilityStatus(event) {
    const totalTickets = parseInt(event.total_tickets) || 0;
    const soldTickets = parseInt(event.sold_tickets) || 0;

    if (totalTickets === 0) return 'no_tickets';
    if (soldTickets >= totalTickets) return 'sold_out';
    if (soldTickets / totalTickets > 0.8) return 'limited';
    return 'available';
  }

  /**
   * Get categories
   * @returns {Array} Categories list
   */
  static async getCategories() {
    try {
      const query = `
        SELECT id, name, slug, description, icon
        FROM categories
        WHERE is_active = true
        ORDER BY name
      `;

      const result = await pool.query(query);
      return result.rows;

    } catch (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }

  /**
  * Submit event for admin approval
  * Change status from 'draft' to 'pending'
  */
 static async submitForApproval(eventId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check permission
      const permissionQuery = `
        SELECT role FROM event_organizer_members
        WHERE event_id = $1 AND user_id = $2 AND is_active = true
        AND role = 'owner'
      `;
      const permissionResult = await client.query(permissionQuery, [eventId, userId]);
    
      if (permissionResult.rows.length === 0) {
        throw new Error('Only event owner can submit for approval');
      }

      // Check event has required data
      const eventQuery = `
        SELECT 
          title, venue_name, venue_address,
          (SELECT COUNT(*) FROM event_sessions WHERE event_id = $1) as session_count,
          (SELECT COUNT(*) FROM ticket_types WHERE event_id = $1) as ticket_count
        FROM events WHERE id = $1
      `;
      const eventResult = await client.query(eventQuery, [eventId]);
      const event = eventResult.rows[0];

      // Validate before submit
      if (!event.title || !event.venue_name || !event.venue_address) {
        throw new Error('Event must have title, venue name, and address');
      }
      if (parseInt(event.session_count) === 0) {
        throw new Error('Event must have at least one session');
      }
      if (parseInt(event.ticket_count) === 0) {
        throw new Error('Event must have at least one ticket type');
      }

      // Update status to pending
      const updateQuery = `
        UPDATE events
        SET status = 'pending', updated_at = NOW()
        WHERE id = $1 AND status = 'draft'
        RETURNING *
      `;
      const result = await client.query(updateQuery, [eventId]);

      if (result.rows.length === 0) {
        throw new Error('Event not found or already submitted');
      }

      await client.query('COMMIT');
    
      console.log(`📤 Event submitted for approval: ${event.title}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Approve event (Admin only)
   */
  static async approve(eventId, adminId) {
    const query = `
      UPDATE events
      SET status = 'approved',
          approved_by = $1,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `;
    
    const result = await pool.query(query, [adminId, eventId]);
    
    if (result.rows.length === 0) {
      throw new Error('Event not found or not pending approval');
    }
    
    console.log(`✅ Event approved: ${result.rows[0].title}`);
    return result.rows[0];
  }

  /**
   * Reject event (Admin only)
   */
  static async reject(eventId, adminId, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const query = `
      UPDATE events
      SET status = 'rejected',
          approved_by = $1,
          approved_at = NOW(),
          rejection_reason = $2,
          updated_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `;
    
    const result = await pool.query(query, [adminId, reason, eventId]);
    
    if (result.rows.length === 0) {
      throw new Error('Event not found or not pending approval');
    }
    
    console.log(`❌ Event rejected: ${result.rows[0].title}`);
    return result.rows[0];
  }

  /**
   * Get events by organizer
   */
  static async findByOrganizer(organizerId, filters = {}, pagination = { page: 1, limit: 10 }) {
    const { status } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    let whereConditions = ['e.organizer_id = $1'];
    let queryParams = [organizerId];
    let paramCount = 2;

    if (status) {
      whereConditions.push(`e.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        e.id, e.title, e.slug, e.status, e.privacy_type,
        e.created_at, e.updated_at,
        e.cover_image, e.thumbnail_image, 
        e.venue_name, e.venue_city,
        c.name as category_name,
        (SELECT COUNT(*) FROM event_sessions WHERE event_id = e.id) as session_count,
        (SELECT SUM(tt.sold_quantity) FROM ticket_types tt WHERE tt.event_id = e.id) as tickets_sold,
        (SELECT SUM(tt.total_quantity) FROM ticket_types tt WHERE tt.event_id = e.id) as total_tickets,
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o 
        WHERE o.event_id = e.id AND o.status = 'paid') as revenue
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM events e WHERE ${whereClause}
    `;

    queryParams.push(limit, offset);
    const countParams = queryParams.slice(0, -2);

    const [eventsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      events: eventsResult.rows.map(e => ({
        ...e,
        session_count: parseInt(e.session_count) || 0,
        tickets_sold: parseInt(e.tickets_sold) || 0,
        total_tickets: parseInt(e.total_tickets) || 0,
        revenue: parseFloat(e.revenue) || 0
      })),
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: totalCount,
        per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1
      }
    };
  }

  /**
   * Get pending events (Admin only)
   */
  static async findPendingApproval(pagination = { page: 1, limit: 20 }) {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        e.id, e.title, e.slug, e.description, e.short_description,
        e.created_at, e.updated_at,
        e.cover_image, e.venue_name, e.venue_city,
        c.name as category_name,
        u.first_name || ' ' || u.last_name as organizer_name,
        u.email as organizer_email,
        (SELECT COUNT(*) FROM event_sessions WHERE event_id = e.id) as session_count,
        (SELECT COUNT(*) FROM ticket_types WHERE event_id = e.id) as ticket_count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at ASC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) as total FROM events WHERE status = 'pending'`;

    const [eventsResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const totalCount = parseInt(countResult.rows[0].total);

    return {
      events: eventsResult.rows.map(e => ({
        ...e,
        session_count: parseInt(e.session_count) || 0,
        ticket_count: parseInt(e.ticket_count) || 0
      })),
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        per_page: limit
      }
    };
  }

  /**
   * Check user permission
   */
  static async checkPermission(eventId, userId, requiredRoles = ['owner', 'manager']) {
    const query = `
      SELECT role FROM event_organizer_members
      WHERE event_id = $1 AND user_id = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [eventId, userId]);
    
    if (result.rows.length === 0) {
      return { hasPermission: false, role: null };
    }
    
    const userRole = result.rows[0].role;
    return { 
      hasPermission: requiredRoles.includes(userRole), 
      role: userRole 
    };
  }

  /**
   * Get event statistics
   */
  static async getStatistics(eventId) {
    const query = `
      SELECT 
        e.title, e.status, e.view_count,
        (SELECT SUM(tt.total_quantity) FROM ticket_types tt WHERE tt.event_id = e.id) as total_tickets,
        (SELECT SUM(tt.sold_quantity) FROM ticket_types tt WHERE tt.event_id = e.id) as sold_tickets,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'paid') as paid_orders,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'paid'), 0) as total_revenue,
        COALESCE(AVG(o.total_amount) FILTER (WHERE o.status = 'paid'), 0) as avg_order_value,
        COUNT(DISTINCT t.id) FILTER (WHERE t.is_checked_in) as checked_in_count,
        COUNT(DISTINCT o.user_id) FILTER (WHERE o.status = 'paid') as unique_customers
      FROM events e
      LEFT JOIN orders o ON e.id = o.event_id
      LEFT JOIN tickets t ON o.id = t.order_id
      WHERE e.id = $1
      GROUP BY e.id
    `;
    
    const result = await pool.query(query, [eventId]);
    
    if (result.rows.length === 0) {
      throw new Error('Event not found');
    }
    
    const stats = result.rows[0];
    const totalTickets = parseInt(stats.total_tickets) || 0;
    const soldTickets = parseInt(stats.sold_tickets) || 0;
    const checkedIn = parseInt(stats.checked_in_count) || 0;
    
    return {
      title: stats.title,
      status: stats.status,
      view_count: parseInt(stats.view_count) || 0,
      tickets: {
        total: totalTickets,
        sold: soldTickets,
        available: totalTickets - soldTickets,
        sold_percentage: totalTickets > 0 ? Math.round((soldTickets / totalTickets) * 100) : 0
      },
      orders: {
        paid: parseInt(stats.paid_orders) || 0,
        pending: parseInt(stats.pending_orders) || 0
      },
      revenue: {
        total: parseFloat(stats.total_revenue) || 0,
        average_order: parseFloat(stats.avg_order_value) || 0
      },
      checkin: {
        checked_in: checkedIn,
        percentage: soldTickets > 0 ? Math.round((checkedIn / soldTickets) * 100) : 0
      },
      customers: {
        unique: parseInt(stats.unique_customers) || 0
      }
    };
  }
}

module.exports = EventModel;