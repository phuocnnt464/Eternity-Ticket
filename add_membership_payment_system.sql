-- server/migrations/001_add_membership_payment_system.sql

-- =============================================
-- MEMBERSHIP PAYMENT SYSTEM
-- Migration: 001
-- Created: 2025-10-31
-- =============================================

BEGIN;

-- 1. Create membership pricing table
CREATE TABLE IF NOT EXISTS membership_pricing (
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

-- 2. Create membership orders table
CREATE TABLE IF NOT EXISTS membership_orders (
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

-- 3. Update memberships table
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES membership_orders(id);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS payment_method payment_method;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_membership_orders_user ON membership_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_orders_status ON membership_orders(status);
CREATE INDEX IF NOT EXISTS idx_membership_orders_created ON membership_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_orders_number ON membership_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_memberships_user_active ON memberships(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date) WHERE is_active = true AND end_date IS NOT NULL;

-- 5. Create triggers
CREATE TRIGGER IF NOT EXISTS update_membership_orders_updated_at 
    BEFORE UPDATE ON membership_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_membership_pricing_updated_at 
    BEFORE UPDATE ON membership_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Insert default pricing
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

COMMIT;