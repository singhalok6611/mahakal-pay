-- Default Admin User (password: admin123)
INSERT OR IGNORE INTO users (id, role, name, email, phone, pan, password_hash, status, kyc_status, approval_status)
VALUES (1, 'admin', 'Admin', 'admin@mahakalpay.in', '9999999999', 'AAAPM0001A',
        '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
        'active', 'approved', 'approved');

-- Admin wallet — starts at zero on a fresh DB. Real money flows in via
-- Pay2All top-ups; nothing is seeded.
INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (1, 0.00);

-- Mobile Operators
INSERT OR IGNORE INTO operators (name, code, service_type, commission_pct) VALUES
('Airtel', 'airtel', 'mobile', 3.0),
('Jio', 'jio', 'mobile', 2.5),
('Vi (Vodafone Idea)', 'vi', 'mobile', 3.0),
('BSNL', 'bsnl', 'mobile', 4.0),
('MTNL', 'mtnl', 'mobile', 4.0);

-- DTH Operators
INSERT OR IGNORE INTO operators (name, code, service_type, commission_pct) VALUES
('Airtel Digital TV', 'airtel_dth', 'dth', 3.5),
('Dish TV', 'dish_tv', 'dth', 3.5),
('Tata Play', 'tata_play', 'dth', 3.0),
('Sun Direct', 'sun_direct', 'dth', 3.5),
('Videocon D2H', 'videocon_d2h', 'dth', 3.5);

-- FASTag Operators
INSERT OR IGNORE INTO operators (name, code, service_type, commission_pct) VALUES
('Paytm FASTag', 'paytm_fastag', 'fastag', 1.0),
('ICICI FASTag', 'icici_fastag', 'fastag', 1.0),
('SBI FASTag', 'sbi_fastag', 'fastag', 1.0),
('HDFC FASTag', 'hdfc_fastag', 'fastag', 1.0),
('Axis FASTag', 'axis_fastag', 'fastag', 1.0),
('Kotak FASTag', 'kotak_fastag', 'fastag', 1.0);

-- Default Settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('site_name', 'Mahakal Pay'),
('site_tagline', 'Instant Recharge & Bill Payments'),
('support_email', 'alok.singh6611@gmail.com'),
('support_phone', '9140929113'),
('min_recharge', '10'),
('max_recharge', '10000'),
('min_fund_request', '500'),
-- Top-up fee removed (Razorpay registration in progress). Full gross credited.
('platform_fee_pct', '0.0'),
-- Commission split percentages — ABSOLUTE percentage points of the
-- recharge amount, NOT a fraction of the retailer commission. On every
-- successful recharge the operator's commission_pct is the total pool
-- and the splits are deducted from it (cascading cap so the three pieces
-- always sum to exactly the operator pct, never go negative).
--   Example: ₹500 Airtel recharge, operator pct 3% =>
--     admin       = 0.50% × 500 = ₹2.50
--     distributor = 0.25% × 500 = ₹1.25
--     retailer    = 2.25% × 500 = ₹11.25  (sum: ₹15.00)
('distributor_share_pct', '0.25'),
('admin_share_pct', '0.5');

-- Backfill PAN + approval_status for the admin row on databases where the
-- INSERT OR IGNORE above was a no-op (row existed before slice 1).
UPDATE users SET pan = 'AAAPM0001A' WHERE id = 1 AND (pan IS NULL OR pan = '');
UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = '';
