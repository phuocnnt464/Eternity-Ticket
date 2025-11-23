-- =============================================
-- ETERNITY TICKET DATABASE SCHEMA
-- PostgreSQL Database for Event Ticketing System
-- Version: 1.1 (Consolidated)
-- =============================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE user_role AS ENUM (
    'participant',
    'organizer',
    'admin',
    'sub_admin'
);

CREATE TYPE membership_tier AS ENUM (
    'basic',
    'advanced',
    'premium'
);

CREATE TYPE event_privacy AS ENUM (
    'public',
    'private'
);

CREATE TYPE event_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'active',
    'completed',
    'cancelled'
);

CREATE TYPE organizer_member_role AS ENUM (
    'owner',
    'manager',
    'checkin_staff'
);

CREATE TYPE order_status AS ENUM (
    'pending',
    'processing',
    'paid',
    'failed',
    'cancelled',
    'refunded'
);

CREATE TYPE payment_method AS ENUM (
    'vnpay',
    'momo',
    'banking',
    'cash'
);

CREATE TYPE notification_type AS ENUM (
    'system',
    'event_reminder',
    'payment',
    'membership',
    'promotion'
);

CREATE TYPE coupon_type AS ENUM (
    'percentage',
    'fixed_amount'
);

CREATE TYPE ticket_status AS ENUM (
    'valid',
    'used',
    'cancelled',
    'refunded'
);

CREATE TYPE refund_reason AS ENUM (
    'event_cancelled',
    'payment_error',
    'duplicate_payment',
    'other'
);

CREATE TYPE refund_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'processing',
    'completed'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Vietnam',
    
    -- Email verification
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    
    -- Password reset
    reset_password_token VARCHAR(255),
    reset_password_expires_at TIMESTAMP,
    
    -- Security
    last_login_at TIMESTAMP,
    last_purchase_at TIMESTAMP,
    purchase_cooldown_until TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Memberships pricing table (from migration)
CREATE TABLE membership_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier membership_tier NOT NULL UNIQUE,
    monthly_price DECIMAL(12,2) NOT NULL,
    quarterly_price DECIMAL(12,2),
    yearly_price DECIMAL(12,2),
    features JSONB DEFAULT '[]',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_prices_positive CHECK (
        monthly_price >= 0 AND
        (quarterly_price IS NULL OR quarterly_price >= 0) AND
        (yearly_price IS NULL OR yearly_price >= 0)
    )
);

-- Memberships table (consolidated)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier membership_tier NOT NULL DEFAULT 'basic',
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    payment_amount DECIMAL(12,2),
    payment_date TIMESTAMP,
    auto_renewal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Added from migration
    order_id UUID, -- FK constraint added later to avoid circular dependency
    payment_method payment_method,
    payment_transaction_id VARCHAR(255),
    billing_period VARCHAR(20) DEFAULT 'monthly',
    next_billing_date TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    CONSTRAINT check_membership_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Membership orders table (from migration)
CREATE TABLE membership_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    membership_id UUID REFERENCES memberships(id),
    
    tier membership_tier NOT NULL,
    billing_period VARCHAR(20) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    
    amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    
    status order_status DEFAULT 'pending',
    payment_method payment_method,
    payment_transaction_id VARCHAR(255),
    payment_data JSONB,
    paid_at TIMESTAMP,
    
    is_renewal BOOLEAN DEFAULT FALSE,
    previous_tier membership_tier,
    coupon_code VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT check_membership_order_amounts CHECK (
        amount >= 0 AND
        discount_amount >= 0 AND
        vat_amount >= 0 AND
        total_amount >= 0
    ),
    CONSTRAINT check_membership_dates CHECK (end_date > start_date)
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Event images
    cover_image VARCHAR(500),
    thumbnail_image VARCHAR(500),
    logo_image VARCHAR(500),
    venue_map_image VARCHAR(500),
    
    -- Venue information
    venue_name VARCHAR(255),
    venue_address TEXT,
    venue_city VARCHAR(100),
    venue_capacity INTEGER,
    venue_coordinates POINT,
    
    -- Organizer information
    organizer_name VARCHAR(255),
    organizer_description TEXT,
    organizer_contact_email VARCHAR(255),
    organizer_contact_phone VARCHAR(20),
    
    -- Event settings
    privacy_type event_privacy DEFAULT 'public',
    private_access_code VARCHAR(100),
    status event_status DEFAULT 'draft',
    
    -- Payment information
    payment_account_info JSONB,
    
    -- Confirmation content
    booking_confirmation_content TEXT,
    
    -- Metadata
    terms_and_conditions TEXT,
    additional_info JSONB,
    view_count INTEGER DEFAULT 0,
    
    -- Admin fields
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event sessions table
CREATE TABLE event_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    min_tickets_per_order INTEGER DEFAULT 1,
    max_tickets_per_order INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_session_time CHECK (start_time < end_time),
    CONSTRAINT check_session_min_max CHECK (min_tickets_per_order <= max_tickets_per_order)
);

-- Ticket types table
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    total_quantity INTEGER NOT NULL,
    sold_quantity INTEGER DEFAULT 0,
    min_quantity_per_order INTEGER DEFAULT 1,
    max_quantity_per_order INTEGER DEFAULT 10,
    
    -- Sale period
    sale_start_time TIMESTAMP NOT NULL,
    sale_end_time TIMESTAMP NOT NULL,
    
    -- Early access
    premium_early_access_minutes INTEGER DEFAULT 0,
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_price_positive CHECK (price >= 0),
    CONSTRAINT check_total_quantity_positive CHECK (total_quantity > 0),
    CONSTRAINT check_sold_quantity CHECK (sold_quantity >= 0 AND sold_quantity <= total_quantity),
    CONSTRAINT check_min_max_quantity CHECK (min_quantity_per_order <= max_quantity_per_order),
    CONSTRAINT check_sale_time CHECK (sale_start_time < sale_end_time)
);

-- Event organizer members table
CREATE TABLE event_organizer_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role organizer_member_role NOT NULL,
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- =============================================
-- ORDERS & PAYMENTS
-- =============================================

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    session_id UUID NOT NULL REFERENCES event_sessions(id),
    
    -- Pricing
    subtotal DECIMAL(12,2) NOT NULL,
    membership_discount DECIMAL(12,2) DEFAULT 0,
    coupon_discount DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Status and timing
    status order_status DEFAULT 'pending',
    reserved_until TIMESTAMP,
    
    -- Payment info
    payment_method payment_method,
    payment_transaction_id VARCHAR(255),
    payment_data JSONB,
    paid_at TIMESTAMP,
    
    -- Customer info
    customer_info JSONB,
    
    -- Coupon
    coupon_code VARCHAR(50),
    
    -- Tracking
    membership_tier_at_purchase membership_tier,
    is_early_access BOOLEAN DEFAULT FALSE,
    applied_discounts JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_order_amounts CHECK (
        subtotal >= 0 AND
        membership_discount >= 0 AND
        coupon_discount >= 0 AND
        vat_amount >= 0 AND
        total_amount >= 0
    ),
    CONSTRAINT check_reserved_until CHECK (
        status != 'pending' OR 
        reserved_until IS NULL OR 
        reserved_until > created_at
    )
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_order_item_quantity_positive CHECK (quantity > 0)
);

-- Payment failures (from extra script)
CREATE TABLE payment_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_data JSONB,
    error TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    session_id UUID NOT NULL REFERENCES event_sessions(id),
    
    -- QR Code
    qr_code_data TEXT NOT NULL,
    qr_code_image_url TEXT,
    
    -- Status
    status ticket_status DEFAULT 'valid',
    
    -- Check-in
    is_checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP,
    checked_in_by UUID REFERENCES users(id),
    check_in_location TEXT,
    
    -- Holder info
    holder_name VARCHAR(255),
    holder_email VARCHAR(255),
    holder_phone VARCHAR(20),
    
    -- Refund
    refunded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- REFUNDS
-- =============================================

-- Refund requests table
CREATE TABLE refund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    reason refund_reason NOT NULL,
    description TEXT,
    refund_amount DECIMAL(12,2) NOT NULL,
    status refund_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    rejection_reason TEXT,
    refund_transaction_id VARCHAR(255),
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PROMOTIONS & COUPONS
-- =============================================

-- Coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scope
    event_id UUID REFERENCES events(id),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Discount settings
    type coupon_type NOT NULL,
    discount_value DECIMAL(12,2) NOT NULL,
    max_discount_amount DECIMAL(12,2),
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Usage limits
    usage_limit INTEGER,
    usage_limit_per_user INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    
    -- Membership restrictions
    membership_tiers membership_tier[],
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_discount_value CHECK (
        (type = 'percentage' AND discount_value >= 0 AND discount_value <= 100) OR
        (type = 'fixed_amount' AND discount_value >= 0)
    ),
    CONSTRAINT check_usage_limits CHECK (usage_limit IS NULL OR usage_limit > 0)
);

-- Coupon usage tracking
CREATE TABLE coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    discount_amount DECIMAL(12,2) NOT NULL,
    used_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- QUEUE & WAITING ROOM
-- =============================================

-- Waiting room configs
CREATE TABLE waiting_room_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
    max_capacity INTEGER DEFAULT 1000,
    queue_timeout_minutes INTEGER DEFAULT 15,
    concurrent_purchase_limit INTEGER DEFAULT 100,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, session_id)
);

-- Waiting queue
CREATE TABLE waiting_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    session_id UUID NOT NULL REFERENCES event_sessions(id),
    queue_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    priority_score INTEGER DEFAULT 0,
    estimated_wait_minutes INTEGER,
    session_token VARCHAR(255),
    ip_address INET,
    entered_at TIMESTAMP DEFAULT NOW(),
    activated_at TIMESTAMP,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_heartbeat TIMESTAMP,
    UNIQUE(event_id, session_id, queue_number)
);

-- =============================================
-- NOTIFICATIONS & COMMUNICATIONS
-- =============================================

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Related entities
    event_id UUID REFERENCES events(id),
    order_id UUID REFERENCES orders(id),
    
    -- Metadata
    data JSONB DEFAULT '{}',
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SECURITY & SESSIONS
-- =============================================

-- Rate limits table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(identifier, action, window_start)
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SYSTEM LOGS & AUDIT
-- =============================================

-- Activity logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin audit logs
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SYSTEM SETTINGS & UPLOADS
-- =============================================

-- System settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- File uploads tracking
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- EVENT INVITATIONS
-- =============================================
CREATE TABLE event_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role organizer_member_role NOT NULL DEFAULT 'checkin_staff',
  invited_by UUID NOT NULL REFERENCES users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, email)
);

-- =============================================
-- LATE-BINDING FOREIGN KEYS (For Circular Dependencies)
-- =============================================
-- Add FK from memberships to membership_orders after both tables are created
ALTER TABLE memberships 
    ADD CONSTRAINT fk_memberships_order 
    FOREIGN KEY (order_id) REFERENCES membership_orders(id);

-- =============================================
-- INDEXES FOR PERFORMANCE (Consolidated)
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- Memberships indexes
CREATE UNIQUE INDEX idx_memberships_user_active_unique 
    ON memberships(user_id) 
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_memberships_user_active ON memberships(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date) WHERE is_active = true AND end_date IS NOT NULL;

-- Membership orders indexes
CREATE INDEX IF NOT EXISTS idx_membership_orders_user ON membership_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_orders_status ON membership_orders(status);
CREATE INDEX IF NOT EXISTS idx_membership_orders_created ON membership_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_orders_number ON membership_orders(order_number);

-- Events indexes
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_privacy_status ON events(privacy_type, status);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_active_public ON events(status, created_at DESC) 
    WHERE status = 'active' AND privacy_type = 'public';
CREATE INDEX idx_events_title_gin ON events USING gin(to_tsvector('english', title));

-- Event sessions indexes
CREATE INDEX idx_event_sessions_event ON event_sessions(event_id);
CREATE INDEX idx_event_sessions_time ON event_sessions(start_time, end_time);
CREATE INDEX idx_event_sessions_event_active ON event_sessions(event_id, is_active);

-- Ticket types indexes
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE INDEX idx_ticket_types_session ON ticket_types(session_id);
CREATE INDEX idx_ticket_types_session_active ON ticket_types(session_id, is_active);
CREATE INDEX idx_ticket_types_sale_time ON ticket_types(sale_start_time, sale_end_time)
    WHERE is_active = true;

-- Event organizer members indexes
CREATE INDEX idx_event_organizer_members_lookup ON event_organizer_members(event_id, user_id, role)
    WHERE is_active = true;

-- Orders indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_user_status_created ON orders(user_id, status, created_at DESC);
CREATE INDEX idx_orders_pending_reserved ON orders(reserved_until) 
    WHERE status = 'pending' AND reserved_until IS NOT NULL;

-- Payment failures indexes
CREATE INDEX idx_payment_failures_order_id ON payment_failures(order_id);
CREATE INDEX idx_payment_failures_unresolved ON payment_failures(resolved) WHERE resolved = FALSE;

-- Tickets indexes
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_checkin ON tickets(is_checked_in);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_order_status ON tickets(order_id, status);
CREATE INDEX idx_tickets_event_status ON tickets(event_id, status);
CREATE INDEX idx_tickets_event_status_checkin ON tickets(event_id, status, is_checked_in);
CREATE INDEX idx_tickets_holder_email ON tickets(holder_email) 
    WHERE holder_email IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code_data) WHERE status = 'valid';


-- Refund requests indexes
CREATE INDEX idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_user ON refund_requests(user_id);
CREATE INDEX idx_refund_requests_created_at ON refund_requests(created_at DESC);

-- Queue indexes
CREATE INDEX idx_waiting_queue_event_session ON waiting_queue(event_id, session_id);
CREATE INDEX idx_waiting_queue_user_status ON waiting_queue(user_id, status);
CREATE INDEX idx_waiting_queue_number ON waiting_queue(queue_number);
CREATE INDEX idx_waiting_queue_priority ON waiting_queue(status, priority_score DESC, queue_number);
CREATE INDEX idx_waiting_queue_heartbeat ON waiting_queue(last_heartbeat);

-- Waiting room configs indexes
CREATE INDEX idx_waiting_room_configs_event ON waiting_room_configs(event_id, session_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Rate limits indexes
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(blocked_until);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) 
    WHERE is_active = true;

CREATE INDEX idx_invitations_token ON event_invitations(invitation_token);
CREATE INDEX idx_invitations_email ON event_invitations(email);

-- =============================================
-- TRIGGERS (Consolidated)
-- =============================================

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_sessions_updated_at BEFORE UPDATE ON event_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refund_requests_updated_at BEFORE UPDATE ON refund_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_waiting_room_configs_updated_at BEFORE UPDATE ON waiting_room_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
-- Triggers from migration
CREATE TRIGGER update_membership_orders_updated_at 
    BEFORE UPDATE ON membership_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_pricing_updated_at 
    BEFORE UPDATE ON membership_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply refund trigger
CREATE TRIGGER trigger_refund_tickets AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION auto_update_tickets_on_refund();

-- =============================================
-- INITIAL DATA (Consolidated)
-- =============================================

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
('Music', 'music', 'Music events, concerts, festivals'),
('Sports', 'sports', 'Sports events and competitions'),
('Conference', 'conference', 'Conferences, seminars, workshops'),
('Exhibition', 'exhibition', 'Art and technology exhibitions'),
('Entertainment', 'entertainment', 'Entertainment events and shows'),
('Education', 'education', 'Educational courses and training'),
('Food & Beverage', 'food-beverage', 'Food festivals and culinary events'),
('Business', 'business', 'Business networking and corporate events'),
('Technology', 'technology', 'Tech conferences and product launches'),
('Arts & Culture', 'arts-culture', 'Cultural events and art exhibitions'),
('Health & Wellness', 'health-wellness', 'Wellness workshops and health seminars'),
('Others', 'others', 'Other types of events');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('site_name', 'Eternity Ticket', 'Website name', true),
('site_description', 'Event ticketing and management platform', 'Website description', true),
('max_queue_capacity', '1000', 'Maximum waiting room capacity per event', false),
('ticket_hold_duration_minutes', '15', 'Ticket hold duration in minutes', false),
('max_file_size_mb', '2', 'Maximum file size in MB', false),
('vat_rate', '0.1', 'VAT rate percentage', false),
('premium_discount_rate', '0.1', 'Premium membership discount rate', false),
('advanced_discount_rate', '0.05', 'Advanced membership discount rate', false),
('premium_early_access_hours', '5', 'Premium early access hours', false),
('currency_code', 'VND', 'Default currency code', true),
('currency_symbol', '₫', 'Default currency symbol', true),
('timezone', 'Asia/Ho_Chi_Minh', 'Default timezone', true),
('date_format', 'DD/MM/YYYY', 'Default date format', true),
('time_format', '24', 'Time format (12 or 24 hour)', true);

-- Insert default membership pricing (from migration)
INSERT INTO membership_pricing (tier, monthly_price, quarterly_price, yearly_price, features, description, sort_order) 
VALUES
('basic', 0, 0, 0, 
 '["Access to public events", "Standard support", "Email notifications"]'::jsonb,
 'Free tier with basic features', 1),
('advanced', 99000, 270000, 950000,
 '["5% discount on all tickets", "Priority support", "Early event access (30 min)", "Advanced analytics"]'::jsonb,
 'Perfect for regular event-goers', 2),
('premium', 299000, 810000, 2900000,
 '["10% discount on all tickets", "24/7 VIP support", "Early event access (60 min)", "Exclusive events access", "Premium analytics", "Custom event recommendations"]'::jsonb,
 'Best value for event enthusiasts', 3)
ON CONFLICT (tier) DO NOTHING;

-- Insert default admin user
INSERT INTO users (email, password_hash, role, first_name, last_name, is_email_verified, is_active) 
VALUES ('admin@eternityticket.com', crypt('admin123', gen_salt('bf')), 'admin', 'System', 'Administrator', true, true);

-- Insert email templates
INSERT INTO email_templates (name, subject, html_content) VALUES
('welcome', 'Welcome to Eternity Ticket', '<h1>Welcome {{first_name}}!</h1><p>Thank you for registering your account.</p>'),
('ticket_confirmation', 'Ticket Purchase Confirmation', '<h1>Ticket Purchase Successful!</h1><p>Order Number: {{order_number}}</p><p>Event: {{event_title}}</p>'),
('event_reminder', 'Event Reminder', '<h1>Upcoming Event: {{event_title}}</h1><p>Your event is starting soon!</p>'),
('membership_confirmation', 'Membership Upgrade Confirmation', '<h1>{{tier}} Membership Upgrade Successful!</h1><p>Enjoy your new benefits!</p>'),
('password_reset', 'Password Reset Request', '<h1>Password Reset</h1><p>Click the link below to reset your password:</p><p><a href="{{reset_link}}">Reset Password</a></p>'),
('email_verification', 'Email Verification', '<h1>Verify Your Email</h1><p>Click the link below to verify your email:</p><p><a href="{{verification_link}}">Verify Email</a></p>'),
('event_approved', 'Event Approved', '<h1>Your Event Has Been Approved!</h1><p>Event: {{event_title}}</p><p>Your event is now live and tickets can be purchased.</p>'),
('event_rejected', 'Event Rejected', '<h1>Event Review Update</h1><p>Event: {{event_title}}</p><p>Reason: {{rejection_reason}}</p>'),
('order_cancelled', 'Order Cancelled', '<h1>Order Cancelled</h1><p>Order Number: {{order_number}}</p><p>Your order has been cancelled and refund will be processed.</p>'),
('refund_approved', 'Refund Request Approved', '<h1>Refund Approved</h1><p>Order: {{order_number}}</p><p>Amount: {{refund_amount}}</p><p>Processing time: 5-7 business days.</p>'),
('refund_rejected', 'Refund Request Rejected', '<h1>Refund Request Rejected</h1><p>Order: {{order_number}}</p><p>Reason: {{reason}}</p>'),
('event_cancelled_notification', 'Event Cancelled', '<h1>Event Cancelled: {{event_title}}</h1><p>Reason: {{cancellation_reason}}</p><p>Refund will be processed automatically.</p>');
INSERT INTO email_templates (name, subject, html_content,variables) VALUES
('admin_account_created', 
 'Administrator Account Created - Eternity Ticket',
 '<h1>{{role_label}} Account Created</h1>
  <p>Hello <strong>{{first_name}} {{last_name}}</strong>,</p>
  <p>Your administrator account has been created.</p>
  <p><strong>Email:</strong> {{email}}<br>
  <strong>Role:</strong> {{role_label}}<br>
  <strong>Temporary Password:</strong> {{temporary_password}}</p>
  <p>Please login at: <a href="{{login_url}}">{{login_url}}</a></p>
  <p><strong>Important:</strong> Change your password immediately after first login.</p>',
 '{"first_name": "", "last_name": "", "email": "", "role_label": "", "temporary_password": "", "login_url": ""}'::jsonb),
('event_invitation',
 'Invitation to join {{event_title}} - Eternity Ticket',
 '<h1>Event Team Invitation</h1>
  <p>Hello,</p>
  <p><strong>{{inviter_name}}</strong> has invited you to join the team for:</p>
  <p><strong>Event:</strong> {{event_title}}<br>
  <strong>Role:</strong> {{role}}</p>
  <p>Accept invitation at: <a href="{{invitation_url}}">{{invitation_url}}</a></p>
  <p><small>This invitation expires in 7 days.</small></p>',
 '{"event_title": "", "inviter_name": "", "role": "", "invitation_url": ""}'::jsonb);
-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE users IS 'User accounts for the system';
COMMENT ON TABLE memberships IS 'Paid membership tiers for users';
COMMENT ON TABLE membership_pricing IS 'Pricing definitions for membership tiers';
COMMENT ON TABLE membership_orders IS 'Transaction logs for membership purchases and renewals';
COMMENT ON TABLE events IS 'Events created by organizers';
COMMENT ON TABLE event_sessions IS 'Multiple sessions/dates for an event';
COMMENT ON TABLE ticket_types IS 'Different ticket categories within a session';
COMMENT ON TABLE orders IS 'Purchase orders for tickets';
COMMENT ON TABLE tickets IS 'Individual electronic tickets';
COMMENT ON TABLE payment_failures IS 'Logs failed payment attempts for investigation';
COMMENT ON TABLE waiting_queue IS 'Virtual waiting room queue for high-demand events';
COMMENT ON TABLE refund_requests IS 'Refund requests from users';
COMMENT ON TABLE coupons IS 'Promotional discount codes';
COMMENT ON TABLE rate_limits IS 'Rate limiting for security';
COMMENT ON TABLE user_sessions IS 'Active user sessions with JWT tokens';

-- =============================================
-- END OF SCHEMA
-- =============================================