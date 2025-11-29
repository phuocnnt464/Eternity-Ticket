// src/models/orderModel.js
const pool = require('../config/database');
const { generateOrderNumber } = require('../utils/helpers');
const QRCode = require('qrcode');
const lockManager = require('../utils/lockManager');
const { generateSecureQRData } = require('../utils/qrCodeGenerator');

class OrderModel {
  /**
   * Create new order with tickets
   * @param {String} userId - User ID
   * @param {Object} orderData - Order data
   * @returns {Object} Created order with tickets
   */
  static async createOrder(userId, orderData) {
    const {
        event_id,
        session_id,
        tickets, // Array of {ticket_type_id, quantity}
        customer_info,
        coupon_code
    } = orderData;

     // ACQUIRE DISTRIBUTED LOCK PER SESSION Prevent concurrent orders from same user
    const userLockKey = `order:user:${userId}:session:${session_id}`;
    const userLockToken = await lockManager.acquireLock(userLockKey, 30000); // 30 seconds

    if (!userLockToken) {
      throw new Error('You already have an order in progress. Please complete your current order or wait a few seconds.');
    }

    // ✅ 2. SESSION LOCK - Prevent ticket overselling
    const sessionLockKey = `order:session:${session_id}`;
    const sessionLockToken = await lockManager.acquireLock(sessionLockKey, 15000);

    if (!sessionLockToken) {
      await lockManager.releaseLock(userLockKey, userLockToken);
      throw new Error('System is busy processing orders. Please try again in a few seconds.');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const QueueModel = require('./queueModel');
      const config = await QueueModel.getWaitingRoomConfig(session_id);
      
      let reservedUntil;
      
      if (config && config.is_enabled) {
        // ===================================
        // CÓ WAITING ROOM → Validate active slot
        // ===================================
        console.log(`✅ Waiting room enabled for session ${session_id}`);
        const activeSlot = await QueueModel.getActiveUser(orderData.session_id, userId);
      
        if (!activeSlot) {
          throw new Error('You must be in an active purchase slot to create an order. Please join the queue first.');
        }

        if (activeSlot.status !== 'active') {
          throw new Error(`Your queue status is "${activeSlot.status}". Only active users can create orders.`);
        }

        // ✅ Verify expiry time
        const now = new Date();
        const expiresAt = new Date(activeSlot.expires_at);

        if (now >= expiresAt) {
          // Mark as expired in database
          await QueueModel.updateQueueStatus(userId, orderData.session_id, 'expired');
          throw new Error('Your purchase time has expired. Please join the queue again.');
        }

        const timeRemaining = Math.floor((expiresAt - now) / 1000);
        console.log(`⏰ Time remaining for user ${userId}: ${timeRemaining}s`);

        // ✅ Use expires_at from queue slot (NOT create new timer)
        reservedUntil = expiresAt;
      } else {
        // ===================================
        // KHÔNG CÓ WAITING ROOM → Timer 15 phút
        // ===================================
        console.log(`⚠️ No waiting room for session ${session_id}, creating 15-minute timer`);
        reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      console.log(`📅 Order will be reserved until: ${reservedUntil.toISOString()}`);

       //  CHECK EXISTING PENDING ORDER
      const pendingOrderCheck = await client.query(`
        SELECT id, order_number, created_at, reserved_until
        FROM orders
        WHERE user_id = $1 
          AND session_id = $2 
          AND status = 'pending'
          AND reserved_until > NOW()
        LIMIT 1
        FOR UPDATE
      `, [userId, session_id]);

      if (pendingOrderCheck.rows.length > 0) {
        const existing = pendingOrderCheck.rows[0];
        const minutesLeft = Math.ceil((new Date(existing.reserved_until) - new Date()) / 60000);
        
        throw new Error(
          `You already have a pending order (${existing.order_number}) for this session. ` +
          `Please complete payment within ${minutesLeft} minutes or wait for it to expire.`
        );
      }

      // Verify session exists and belongs to event
      const sessionCheck = await client.query(`
        SELECT es.id, es.event_id, es.max_tickets_per_order, e.title as event_title
        FROM event_sessions es
        JOIN events e ON es.event_id = e.id
        WHERE es.id = $1 AND es.event_id = $2 AND es.is_active = true
        FOR UPDATE 
      `, [session_id, event_id]);

      if (sessionCheck.rows.length === 0) {
        throw new Error('Invalid session or event');
      }

      const session = sessionCheck.rows[0];

      const membershipQuery = await client.query(`
        SELECT tier FROM memberships 
        WHERE user_id = $1 
          AND is_active = true
          AND (end_date IS NULL OR end_date > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      const membershipTier = membershipQuery.rows.length > 0 ? membershipQuery.rows[0].tier : 'basic';
      console.log(`👤 User membership tier: ${membershipTier}`);

      const { getSystemSetting } = require('../middleware/authMiddleware');
      const earlyAccessHours = parseInt(await getSystemSetting('premium_early_access_hours', '5'));
      const earlyAccessMinutes = earlyAccessHours * 60;
      console.log(`⏰ Early access setting: ${earlyAccessHours} hours (${earlyAccessMinutes} minutes)`);

      // Calculate totals and validate ticket availability
      let subtotal = 0;
      let totalTickets = 0;
      const ticketDetails = [];

      for (const ticketItem of tickets) {
        const { ticket_type_id, quantity } = ticketItem;
        
        // Get ticket type details and check availability
        const ticketQuery = await client.query(`
          SELECT tt.*, (tt.total_quantity - tt.sold_quantity) as available_quantity
          FROM ticket_types tt
          WHERE tt.id = $1 AND tt.session_id = $2 AND tt.is_active = true
          FOR UPDATE
        `, [ticket_type_id, session_id]);

        if (ticketQuery.rows.length === 0) {
          throw new Error(`Ticket type not found: ${ticket_type_id}`);
        }

        const ticketType = ticketQuery.rows[0];

        // Check availability
        if (parseInt(ticketType.available_quantity) < quantity) {
          throw new Error(`Not enough tickets available for ${ticketType.name}. Available: ${ticketType.available_quantity}, Requested: ${quantity}`);
        }

        // Check quantity limits
        if (quantity < ticketType.min_quantity_per_order || quantity > ticketType.max_quantity_per_order) {
          throw new Error(`Invalid quantity for ${ticketType.name}. Must be between ${ticketType.min_quantity_per_order} and ${ticketType.max_quantity_per_order}`);
        }

        // Check sale period
        const now = new Date();
        // if (now < new Date(ticketType.sale_start_time) || now > new Date(ticketType.sale_end_time)) {
        //   throw new Error(`${ticketType.name} is not available for sale at this time`);
        // }

        const saleStartTime = new Date(ticketType.sale_start_time);
        const saleEndTime = new Date(ticketType.sale_end_time);
        
        const earlyAccessStartTime = new Date(saleStartTime.getTime() - earlyAccessMinutes * 60000);
        
        // ✅ Check if in early access period
        const isInEarlyAccessPeriod = now >= earlyAccessStartTime && now < saleStartTime;

        if (isInEarlyAccessPeriod) {
          // ✅ During early access: Only premium members allowed
          if (membershipTier !== 'premium') {
            const minutesRemaining = Math.ceil((saleStartTime - now) / 60000);
            throw new Error(
              `${ticketType.name} is in Premium early access period. ` +
              `Public sale starts in ${minutesRemaining} minutes.  ` +
              `Upgrade to Premium to buy now. `
            );
          }
          // ✅ Premium user during early access → ALLOW
          console.log(`✅ Premium user accessing ${ticketType.name} during early access period`);
        } else {
          // ✅ Outside early access: Check normal sale period
          if (now < earlyAccessStartTime) {
            throw new Error(`Sale for ${ticketType.name} has not started yet`);
          }
          
          if (now > saleEndTime) {
            throw new Error(`Sale for ${ticketType.name} has ended`);
          }
        }

        const itemTotal = parseFloat(ticketType.price) * quantity;
        subtotal += itemTotal;
        totalTickets += quantity;

        ticketDetails.push({
          ticket_type_id,
          ticket_type: ticketType,
          quantity,
          unit_price: parseFloat(ticketType.price),
          total_price: itemTotal
        });
      }

      for (const ticketDetail of ticketDetails) {
        const { ticket_type, quantity } = ticketDetail;
        
        // Validate min/max per ticket type
        if (quantity < ticket_type.min_quantity_per_order) {
          throw new Error(
            `Minimum ${ticket_type.min_quantity_per_order} tickets required for ${ticket_type.name}. You selected ${quantity}.`
          );
        }
        
        if (quantity > ticket_type.max_quantity_per_order) {
          throw new Error(
            `Maximum ${ticket_type.max_quantity_per_order} tickets allowed for ${ticket_type.name}. You selected ${quantity}.`
          );
        }
      }

      const premiumEarlyAccessMaxTickets = parseInt(await getSystemSetting('premium_early_access_max_tickets', '5'));

      // ✅ Check if currently in early access period
      const now = new Date();
      let isInEarlyAccessPeriod = false;

      // Check if ANY ticket in cart is in early access period
      for (const ticketDetail of ticketDetails) {
        const saleStartTime = new Date(ticketDetail.ticket_type.sale_start_time);
        const earlyAccessStartTime = new Date(saleStartTime.getTime() - earlyAccessMinutes * 60000);
        
        if (now >= earlyAccessStartTime && now < saleStartTime) {
          isInEarlyAccessPeriod = true;
          console.log(`⏰ Ticket "${ticketDetail.ticket_type. name}" is in early access period`);
          break;
        }
      }

      // Check session max tickets limit
      // let maxAllowed = session.max_tickets_per_order;


      let maxAllowed;
      let limitReason = '';

      if (isInEarlyAccessPeriod) {
        // During early access: Premium gets limited tickets per order
        if (membershipTier === 'premium') {
          maxAllowed = Math.min(premiumEarlyAccessMaxTickets, session.max_tickets_per_order);
          limitReason = 'Premium early access period';
          console.log(`🌟 Premium early access: max ${maxAllowed} tickets (session limit: ${session.max_tickets_per_order})`);
        } else {
          // Non-premium shouldn't reach here (blocked in earlier validation)
          throw new Error('Only Premium members can purchase during early access period');
        }
      } else {
        // During public sale: Everyone follows session limit
        maxAllowed = session.max_tickets_per_order;
        limitReason = 'Public sale period';
          console.log(`🎫 Public sale: max ${maxAllowed} tickets for all users`);
      }


      // if (membershipTier === 'premium') {
      //   maxAllowed = Math.min(5, session.max_tickets_per_order);
        
      //   if (totalTickets > 5) {
      //     throw new Error(`Premium members can order maximum 5 tickets per order. You selected ${totalTickets}.`);
      //   }
      // }

      // Check session max tickets limit
      // if (totalTickets > maxAllowed) {
      //   throw new Error(`Cannot order more than ${maxAllowed} tickets per session`);
      // }

      if (totalTickets > maxAllowed) {
        if (isInEarlyAccessPeriod && membershipTier === 'premium') {
          throw new Error(
            `Premium early access limit: ${maxAllowed} tickets per order.  You selected ${totalTickets}. `
          );
        } else {
          throw new Error(
            `Maximum ${maxAllowed} tickets per order. You selected ${totalTickets}.`
          );
        }
      }

      // Calculate membership discount
      let membershipDiscount = 0;
      if (membershipTier === 'premium') {
        membershipDiscount = subtotal * 0.10; // 10% discount
      } else if (membershipTier === 'advanced') {
        membershipDiscount = subtotal * 0.05; // 5% discount
      }

      // Apply coupon discount if provided (simplified)
      let couponDiscount = 0;
      let appliedCoupon = null;

      if (coupon_code) {
        console.log(`Applying coupon code: ${coupon_code}`);
       
        // ✅ 1. GET AND LOCK COUPON
        const couponQuery = await client.query(`
          SELECT c.*
          FROM coupons c
          WHERE c.code = $1 
            AND c.is_active = true
            AND c.valid_from <= NOW()
            AND c.valid_until >= NOW()
            AND (c.event_id IS NULL OR c.event_id = $3)
          FOR UPDATE  -- Lock coupon row
        `, [coupon_code, userId, event_id]);

        if (couponQuery.rows.length === 0) {
          throw new Error('Invalid, expired, or not applicable coupon code');
        }

        const coupon = couponQuery.rows[0];

        // ✅ 2. GET AND LOCK USAGE RECORDS
        const usageQuery = await client.query(`
          SELECT 
            COUNT(*) as total_uses,
            COUNT(*) FILTER (WHERE user_id = $2) as user_uses
          FROM coupon_usages
          WHERE coupon_id = $1
          FOR UPDATE  -- ✅ Lock usage records!
        `, [coupon.id, userId]);

        const { total_uses, user_uses } = usageQuery.rows[0];
        
        console.log(`Coupon details:`, {
          code: coupon.code,
          total_uses,
          usage_limit: coupon.usage_limit,
          user_uses,
          usage_limit_per_user: coupon.usage_limit_per_user
        });

        // ✅ 1. CHECK GLOBAL USAGE LIMIT
        if (coupon.usage_limit && parseInt(total_uses) >= coupon.usage_limit) {
          throw new Error('This coupon has reached its usage limit');
        }

        // ✅ 2. CHECK USER USAGE LIMIT
        if (parseInt(user_uses) >= coupon.usage_limit_per_user) {
          throw new Error(`You have already used this coupon ${coupon.usage_limit_per_user} time(s)`);
        }

        // ✅ 3. CHECK MINIMUM ORDER AMOUNT
        if (subtotal < parseFloat(coupon.min_order_amount || 0)) {
          throw new Error(
            `Minimum order amount for this coupon is ${coupon.min_order_amount}. Your subtotal is ${subtotal}`
          );
        }

        // ✅ 4. CHECK MEMBERSHIP TIER RESTRICTION
        if (coupon.membership_tiers && coupon.membership_tiers.length > 0) {
          // Guest (basic) can use general coupons
          // Members can use member-exclusive coupons
          if (!coupon.membership_tiers.includes(membershipTier)) {

            // ✅ Detailed message for different cases
            const tierNames = {
              'basic': 'General users',
              'advanced': 'Advanced members',
              'premium': 'Premium members'
            };
            
            const allowedTiers = coupon.membership_tiers.map(t => tierNames[t] || t).join(', ');
            const currentTierName = tierNames[membershipTier] || membershipTier;

            throw new Error(
              // `This coupon is only available for ${coupon.membership_tiers.join(', ')} members. Your tier: ${membershipTier}`
              `This coupon is only available for: ${allowedTiers}. Your tier: ${currentTierName}`
            );
          }
        }

        // ✅ 5. CALCULATE DISCOUNT (apply AFTER membership discount)
        const discountableAmount = subtotal - membershipDiscount;
        
        if (coupon.type === 'percentage') {
          couponDiscount = discountableAmount * (parseFloat(coupon.discount_value) / 100);
          
          // ✅ Apply max discount limit if exists
          if (coupon.max_discount_amount) {
            couponDiscount = Math.min(couponDiscount, parseFloat(coupon.max_discount_amount));
          }
        } else if (coupon.type === 'fixed_amount') {
          couponDiscount = Math.min(parseFloat(coupon.discount_value), discountableAmount);
        }

        appliedCoupon = coupon;
        
        console.log(`Coupon applied: ${coupon.code}, discount: ${couponDiscount}`);
        
        // INCREMENT USED COUNT
        await client.query(`
          UPDATE coupons 
          SET used_count = used_count + 1,
              updated_at = NOW()
          WHERE id = $1
        `, [coupon.id]);
      }

      // Calculate VAT (10%)
      const vatAmount = (subtotal - membershipDiscount - couponDiscount) * 0.10;
      const totalAmount = subtotal - membershipDiscount - couponDiscount + vatAmount;
      
      // let reservedUntil;
      // if (activeSlot && activeSlot.expires_at) {
      //   // ✅ Dùng expires_at từ queue slot
      //   reservedUntil = new Date(activeSlot.expires_at);
      //   console.log(`✅ Using queue slot expiry: ${reservedUntil}`);
      // } else {
      //   // ⚠️ Fallback nếu không có waiting room (15 phút mới)
      //   reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
      //   console.log(`⚠️ No active slot, creating new expiry: ${reservedUntil}`);
      // }

      // // ✅ KIỂM TRA xem còn thời gian không
      // if (new Date() >= reservedUntil) {
      //   throw new Error('Your purchase time has expired. Please join the queue again.');
      // }

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          order_number, user_id, event_id, session_id,
          subtotal, membership_discount, coupon_discount, vat_amount, total_amount,
          status, reserved_until, customer_info, coupon_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      // const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      const orderResult = await client.query(orderQuery, [
        orderNumber, userId, event_id, session_id,
        subtotal, membershipDiscount, couponDiscount, vatAmount, totalAmount,
        'pending', reservedUntil, 
        JSON.stringify(customer_info),
        orderData.coupon_code || null
      ]);

      const order = orderResult.rows[0];

      // Create order items and individual tickets
      const createdTickets = [];

      for (const ticketDetail of ticketDetails) {
        // ✅ STEP 1: Lock ticket type
        const lockQuery = `
          SELECT id, name, total_quantity, sold_quantity, 
                sale_start_time, sale_end_time
          FROM ticket_types
          WHERE id = $1 AND is_active = true
          FOR UPDATE NOWAIT
        `;
        
        let ticketType;
        try {
          const lockResult = await client.query(lockQuery, [ticketDetail.ticket_type_id]);
          
          if (lockResult.rows.length === 0) {
            throw new Error(`Ticket type not found or inactive`);
          }
          
          ticketType = lockResult.rows[0];
        } catch (lockError) {
          if (lockError.code === '55P03') {
            throw new Error('Too many people are buying this ticket right now. Please try again in a few seconds.');
          }
          throw lockError;
        }

        // ✅ STEP 2: Check availability AFTER lock
        const available = ticketType.total_quantity - ticketType.sold_quantity;
        if (available < ticketDetail.quantity) {
          throw new Error(`Not enough tickets available. Only ${available} tickets left for ${ticketType.name}`);
        }

        // ✅ STEP 3: Verify sale period
        const now = new Date();
        const saleStartTime = new Date(ticketType.sale_start_time);
        const saleEndTime = new Date(ticketType. sale_end_time);

        const earlyAccessStartTime = new Date(saleStartTime.getTime() - earlyAccessMinutes * 60000);

        // ✅ Check if in early access period
        const isInEarlyAccessPeriod = now >= earlyAccessStartTime && now < saleStartTime;

        if (isInEarlyAccessPeriod) {
          // During early access: This code path should only be reached by premium users
          // (because non-premium were already blocked in first validation)
          console.log(`✅ Creating tickets during early access period`);
        } else {
          // Outside early access: Check normal sale period
          if (now < earlyAccessStartTime) {
            throw new Error(`Sale for ${ticketType.name} has not started yet`);
          }
          if (now > saleEndTime) {
            throw new Error(`Sale for ${ticketType.name} has ended`);
          }
        }

        // Create order item
        const orderItemQuery = `
          INSERT INTO order_items (order_id, ticket_type_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

        const orderItemResult = await client.query(orderItemQuery, [
          order.id,
          ticketDetail.ticket_type_id,
          ticketDetail.quantity,
          ticketDetail.unit_price,
          ticketDetail.total_price
        ]);

        const orderItem = orderItemResult.rows[0];

        // Create individual tickets
        for (let i = 0; i < ticketDetail.quantity; i++) {

          // ✅ GENERATE UNIQUE TICKET CODE WITH RETRY
          let ticketCode;
          let retries = 0;
          const maxRetries = 5;
          
          while (retries < maxRetries) {
            // Include counter to ensure uniqueness within same order
            ticketCode = `ET${Date.now()}${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
            
            // CHECK IF EXISTS
            const existing = await client.query(
              'SELECT id FROM tickets WHERE ticket_code = $1',
              [ticketCode]
            );
            
            if (existing.rows.length === 0) {
              break; // Unique code found
            }
            
            retries++;
            if (retries >= maxRetries) {
              throw new Error('Failed to generate unique ticket code after multiple attempts');
            }
            
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Generate QR code data
          // const qrData = JSON.stringify({
          //   ticket_code: ticketCode,
          //   event_id,
          //   session_id,
          //   order_id: order.id,
          //   timestamp: new Date().toISOString()
          // });
          const qrData = generateSecureQRData({
            ticket_code: ticketCode,
            event_id,
            session_id,
            order_id: order.id,
            user_id: userId
          });

          const ticketQuery = `
            INSERT INTO tickets (
              ticket_code, order_id, order_item_id, ticket_type_id, 
              user_id, event_id, session_id, qr_code_data,
              holder_name, holder_email, holder_phone
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `;

          const ticketResult = await client.query(ticketQuery, [
            ticketCode, order.id, orderItem.id, ticketDetail.ticket_type_id,
            userId, event_id, session_id, qrData,
            customer_info.first_name + ' ' + customer_info.last_name,
            customer_info.email,
            customer_info.phone
          ]);

          createdTickets.push(ticketResult.rows[0]);
        }

        // Reserve tickets by updating sold_quantity
        await client.query(`
          UPDATE ticket_types 
          SET sold_quantity = sold_quantity + $1
          WHERE id = $2
        `, [ticketDetail.quantity, ticketDetail.ticket_type_id]);
      }

      // Random cooldown between 2-3 minutes (120-180 seconds)
      const cooldownSeconds = Math.floor(Math.random() * 61) + 120; // 120-180 seconds

      // SET PURCHASE COOLDOWN
      await client.query(`
        UPDATE users 
        SET purchase_cooldown_until = NOW() + ($1 * INTERVAL '1 seconds'),
            last_purchase_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [cooldownSeconds, userId]);

      // await client.query(`
      //   UPDATE users 
      //   SET purchase_cooldown_until = NOW() + INTERVAL '2 minutes',
      //       last_purchase_at = NOW(),
      //       updated_at = NOW()
      //   WHERE id = $1
      // `, [userId]);

      // ✅ 7. INSERT COUPON USAGE RECORD (AFTER ORDER CREATED)
      if (appliedCoupon) {
        await client.query(`
          INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount, used_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [appliedCoupon.id, userId, order.id, couponDiscount]);
        
        console.log(`📝 Coupon usage logged: ${appliedCoupon.code} for order ${order.order_number}`);
      }

      await client.query('COMMIT');

      const timeRemaining = Math.floor((reservedUntil - new Date()) / 1000);

      console.log(`Order created: ${orderNumber} for user: ${userId}, total: ${totalAmount}`);

      return {
        order: orderResult.rows[0],
        tickets: createdTickets,
        // order_items: ticketDetails
        expires_at: reservedUntil,
        time_remaining_seconds: timeRemaining
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      if (sessionLockToken) {
        await lockManager.releaseLock(sessionLockKey, sessionLockToken).catch((err) => {
          console.error('Failed to release lock:', err);
        });
      }
      if (userLockToken) {
        await lockManager.releaseLock(userLockKey, userLockToken).catch((err) => {
          console.error('Failed to release lock:', err);
        });
      }
    }
  }

  /**
   * Get order by ID with details
   * @param {String} orderId - Order ID
   * @param {String} userId - User ID (for ownership check)
   * @returns {Object|null} Order with details
   */
  static async findById(orderId, userId = null) {
    try {
      let whereClause = 'WHERE o.id = $1';
      let queryParams = [orderId];

      if (userId) {
        whereClause += ' AND o.user_id = $2';
        queryParams.push(userId);
      }

      const orderQuery = `
        SELECT 
          o.*,
          e.title as event_title,
          e.venue_name,
          e.start_time as event_date,
          es.title as session_title,
          es.start_time as session_start_time,
          u.first_name || ' ' || u.last_name as customer_name,
          u.email as customer_email,  
          u.phone as phone 
        FROM orders o
        JOIN events e ON o.event_id = e.id
        JOIN event_sessions es ON o.session_id = es.id
        JOIN users u ON o.user_id = u.id
        ${whereClause}
      `;

      const orderResult = await pool.query(orderQuery, queryParams);

      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      console.log("customer_info type:", typeof order.customer_info, order.customer_info);
      // Parse JSON fields
      if (order.customer_info && typeof order.customer_info === 'string') {
        order.customer_info = JSON.parse(order.customer_info);
      }
      if (order.payment_data && typeof order.payment_data === 'string') {
        order.payment_data = JSON.parse(order.payment_data);
      }

      // Get order items and tickets
      const itemsQuery = `
        SELECT 
          oi.*,
          tt.name as ticket_type_name,
          tt.description as ticket_type_description,
          COUNT(t.id) as ticket_count
        FROM order_items oi
        JOIN ticket_types tt ON oi.ticket_type_id = tt.id
        LEFT JOIN tickets t ON oi.id = t.order_item_id
        WHERE oi.order_id = $1
        GROUP BY oi.id, tt.id
        ORDER BY oi.created_at
      `;

      const itemsResult = await pool.query(itemsQuery, [orderId]);
      order.items = itemsResult.rows.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        ticket_count: parseInt(item.ticket_count)
      }));

      // Get tickets
      const ticketsQuery = `
        SELECT 
          t.*,
          tt.name as ticket_type_name
        FROM tickets t
        JOIN ticket_types tt ON t.ticket_type_id = tt.id
        WHERE t.order_id = $1
        ORDER BY t.created_at
      `;

      const ticketsResult = await pool.query(ticketsQuery, [orderId]);
      order.tickets = ticketsResult.rows;

      return order;

    } catch (error) {
      console.error("findById error:", error);
      throw new Error(`Failed to find order: ${error.message}`);
    }
  }

  /**
   * Update order status and payment info
   * @param {String} orderId - Order ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated order
   */
  static async updateOrderStatus(orderId, updateData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const {
        status,
        payment_method,
        payment_transaction_id,
        payment_data,
        paid_at
      } = updateData;

      const updateQuery = `
        UPDATE orders 
        SET status = $1, payment_method = $2, payment_transaction_id = $3,
            payment_data = $4, paid_at = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        status,
        payment_method,
        payment_transaction_id,
        payment_data ? JSON.stringify(payment_data) : null,
        paid_at,
        orderId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = result.rows[0];

      // If payment failed, release reserved tickets
      if (status === 'failed' || status === 'cancelled') {
        await client.query(`
          UPDATE ticket_types 
          SET sold_quantity = sold_quantity - oi.quantity
          FROM order_items oi
          WHERE ticket_types.id = oi.ticket_type_id AND oi.order_id = $1
        `, [orderId]);

        // Update ticket status
        await client.query(`
          UPDATE tickets 
          SET status = 'cancelled'
          WHERE order_id = $1
        `, [orderId]);
      }

      // If payment successful, generate QR codes for tickets
      if (status === 'paid') {
        const tickets = await client.query('SELECT * FROM tickets WHERE order_id = $1', [orderId]);
        
        for (const ticket of tickets.rows) {
          try {
            const qrCodeUrl = await QRCode.toDataURL(ticket.qr_code_data);
            await client.query(`
              UPDATE tickets 
              SET qr_code_image_url = $1
              WHERE id = $2
            `, [qrCodeUrl, ticket.id]);
          } catch (qrError) {
            console.error('Failed to generate QR code for ticket:', ticket.id, qrError);
          }
        }
      }

      await client.query('COMMIT');

      console.log(`Order status updated: ${order.order_number} -> ${status}`);
      return order;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user orders with pagination
   * @param {String} userId - User ID
   * @param {Object} pagination - Pagination options
   * @returns {Object} Orders with pagination
   */
  static async getUserOrders(userId, pagination = { page: 1, limit: 10 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const ordersQuery = `
        SELECT 
          o.id, o.order_number, o.status, o.total_amount, o.created_at, o.paid_at,
          e.title as event_title,
          e.cover_image as event_image,
          es.title as session_title,
          es.start_time as session_start_time,
          COUNT(t.id) as ticket_count
        FROM orders o
        JOIN events e ON o.event_id = e.id
        JOIN event_sessions es ON o.session_id = es.id
        LEFT JOIN tickets t ON o.id = t.order_id
        WHERE o.user_id = $1
        GROUP BY o.id, e.id, es.id
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders
        WHERE user_id = $1
      `;

      const [ordersResult, countResult] = await Promise.all([
        pool.query(ordersQuery, [userId, limit, offset]),
        pool.query(countQuery, [userId])
      ]);

      const orders = ordersResult.rows.map(order => ({
        ...order,
        total_amount: parseFloat(order.total_amount),
        ticket_count: parseInt(order.ticket_count)
      }));

      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        orders,
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
      throw new Error(`Failed to get user orders: ${error.message}`);
    }
  }

  /**
   * Cancel expired orders
   * @returns {Number} Number of cancelled orders
   */
  static async cancelExpiredOrders() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find expired pending orders
      const expiredOrdersQuery = `
        SELECT id, user_id, session_id, order_number
        FROM orders 
        WHERE status = 'pending' AND reserved_until < NOW()
      `;

      const expiredResult = await client.query(expiredOrdersQuery);
      const expiredOrders = expiredResult.rows;

      if (expiredOrders.length === 0) {
        await client.query('COMMIT');
        console.log('✅ No expired orders found');
        return 0;
      }

      const expiredOrderIds = expiredOrders.map(o => o.id);

      console.log(`🔄 Cancelling ${expiredOrderIds.length} expired orders:`, 
      expiredOrders.map(o => o.order_number).join(', '));

      // Cancel expired orders
      await client.query(`
        UPDATE orders 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ANY($1)
      `, [expiredOrderIds]);

      // Release reserved tickets
      await client.query(`
        UPDATE ticket_types 
        SET sold_quantity = sold_quantity - oi.quantity
        FROM order_items oi
        WHERE ticket_types.id = oi.ticket_type_id AND oi.order_id = ANY($1)
      `, [expiredOrderIds]);

      // Update ticket status
      await client.query(`
        UPDATE tickets 
        SET status = 'cancelled'
        WHERE order_id = ANY($1)
      `, [expiredOrderIds]);

      const userIds = expiredOrders.map(o => o.user_id);
      const sessionIds = expiredOrders.map(o => o.session_id);

      // ✅ NEW: Release queue slots and mark as expired
      if (userIds.length > 0 && sessionIds.length > 0) {
        await client.query(`
          UPDATE waiting_queue
          SET status = 'expired', completed_at = NOW()
          WHERE user_id = ANY($1) 
            AND session_id = ANY($2)
            AND status = 'active'
        `, [userIds, sessionIds]);
      }

      await client.query('COMMIT');

      console.log(`Cancelled ${expiredOrderIds.length} expired orders`);

      // Process queue for each session to activate next users
      const QueueModel = require('./queueModel');
      const QueueController = require('../controllers/queueController');
      
      const uniqueSessions = [...new Set(expiredOrders.map(o => o.session_id))];
      
      for (const sessionId of uniqueSessions) {
        try {
          // Remove from Redis active set
          const expiredUsers = expiredOrders
            .filter(o => o.session_id === sessionId)
            .map(o => o.user_id);
          
          for (const userId of expiredUsers) {
            await QueueModel.removeActiveUser(sessionId, userId);
          }
          
          // Process queue to activate next users
          await QueueController.processQueue(sessionId);
          
          console.log(`✅ Processed queue for session ${sessionId} after order expiry`);
        } catch (queueError) {
          console.error(`❌ Failed to process queue for session ${sessionId}:`, queueError);
        }
      }
      
      return expiredOrderIds.length;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
}

module.exports = OrderModel;