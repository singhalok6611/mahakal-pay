-- Default Admin User (password: admin123)
INSERT OR IGNORE INTO users (id, role, name, email, phone, pan, password_hash, status, kyc_status, approval_status)
VALUES (1, 'admin', 'Admin', 'admin@mahakalpay.in', '9999999999', 'AAAPM0001A',
        '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
        'active', 'approved', 'approved');

-- Admin wallet
INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (1, 100000.00);

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

-- =============================================
-- DEMO SEED DATA
-- =============================================

-- Distributors (parent_id = 1, i.e. under admin)
INSERT OR IGNORE INTO users (id, role, name, email, phone, pan, password_hash, status, kyc_status, approval_status, parent_id, shop_name, city)
VALUES
(2, 'distributor', 'Rajesh Kumar', 'rajesh@mahakalpay.in', '9876543210', 'BAAPD0002B',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 1, 'Rajesh Telecom', 'Mumbai'),
(3, 'distributor', 'Suresh Patel', 'suresh@mahakalpay.in', '9876543211', 'CAAPD0003C',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 1, 'Suresh Mobile Centre', 'Delhi');

-- Retailers under Distributor 2 (Rajesh)
INSERT OR IGNORE INTO users (id, role, name, email, phone, pan, password_hash, status, kyc_status, approval_status, parent_id, shop_name, city)
VALUES
(4, 'retailer', 'Amit Sharma', 'amit@mahakalpay.in', '9988776601', 'DAAPR0004D',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 2, 'Amit Recharge Point', 'Mumbai'),
(5, 'retailer', 'Priya Singh', 'priya@mahakalpay.in', '9988776602', 'EAAPR0005E',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 2, 'Priya Mobile Shop', 'Pune'),
(6, 'retailer', 'Vikram Joshi', 'vikram@mahakalpay.in', '9988776603', 'FAAPR0006F',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 2, 'Vikram Communications', 'Mumbai');

-- Retailers under Distributor 3 (Suresh)
INSERT OR IGNORE INTO users (id, role, name, email, phone, pan, password_hash, status, kyc_status, approval_status, parent_id, shop_name, city)
VALUES
(7, 'retailer', 'Neha Gupta', 'neha@mahakalpay.in', '9988776604', 'GAAPR0007G',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 3, 'Neha Telecom', 'Delhi'),
(8, 'retailer', 'Rohan Verma', 'rohan@mahakalpay.in', '9988776605', 'HAAPR0008H',
 '$2a$10$AxEVlMOb/PMXDBiekAAUZOv4O7xm9oMC7eE3Za5r9PuSh7HWKm.1O',
 'active', 'approved', 'approved', 3, 'Rohan Digital Services', 'Noida');

-- Backfill PAN + approval_status for already-seeded rows on databases
-- where the INSERT OR IGNORE above was a no-op (rows existed before slice 1).
UPDATE users SET pan = 'AAAPM0001A' WHERE id = 1 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'BAAPD0002B' WHERE id = 2 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'CAAPD0003C' WHERE id = 3 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'DAAPR0004D' WHERE id = 4 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'EAAPR0005E' WHERE id = 5 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'FAAPR0006F' WHERE id = 6 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'GAAPR0007G' WHERE id = 7 AND (pan IS NULL OR pan = '');
UPDATE users SET pan = 'HAAPR0008H' WHERE id = 8 AND (pan IS NULL OR pan = '');
UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = '';

-- Wallets for all demo users
INSERT OR IGNORE INTO wallets (user_id, balance) VALUES
(2, 50000.00),
(3, 35000.00),
(4, 8500.00),
(5, 6200.00),
(6, 4800.00),
(7, 7100.00),
(8, 3200.00);

-- Sample Transactions (recharges)
INSERT OR IGNORE INTO transactions (id, user_id, service_type, operator, subscriber_id, amount, commission, status, api_txn_id, created_at)
VALUES
(1, 4, 'mobile', 'airtel', '9123456789', 299.00, 8.97, 'success', 'TXN001', datetime('now', '-5 days')),
(2, 4, 'mobile', 'jio', '9234567890', 199.00, 4.98, 'success', 'TXN002', datetime('now', '-4 days')),
(3, 5, 'dth', 'tata_play', 'TP12345678', 450.00, 13.50, 'success', 'TXN003', datetime('now', '-3 days')),
(4, 6, 'mobile', 'vi', '9345678901', 149.00, 4.47, 'success', 'TXN004', datetime('now', '-3 days')),
(5, 7, 'fastag', 'paytm_fastag', 'MH12AB1234', 500.00, 5.00, 'success', 'TXN005', datetime('now', '-2 days')),
(6, 8, 'mobile', 'bsnl', '9456789012', 99.00, 3.96, 'success', 'TXN006', datetime('now', '-2 days')),
(7, 4, 'dth', 'airtel_dth', 'AD98765432', 350.00, 12.25, 'success', 'TXN007', datetime('now', '-1 day')),
(8, 5, 'mobile', 'airtel', '9567890123', 599.00, 17.97, 'processing', 'TXN008', datetime('now', '-1 day')),
(9, 7, 'mobile', 'jio', '9678901234', 249.00, 6.23, 'failed', 'TXN009', datetime('now', '-12 hours')),
(10, 6, 'fastag', 'icici_fastag', 'DL01CD5678', 1000.00, 10.00, 'success', 'TXN010', datetime('now', '-6 hours'));

-- Wallet Transactions
INSERT OR IGNORE INTO wallet_transactions (id, wallet_id, user_id, type, amount, balance_before, balance_after, description, created_at)
VALUES
(1, 2, 2, 'credit', 50000.00, 0.00, 50000.00, 'Initial fund load by Admin', datetime('now', '-10 days')),
(2, 3, 3, 'credit', 35000.00, 0.00, 35000.00, 'Initial fund load by Admin', datetime('now', '-10 days')),
(3, 4, 4, 'credit', 10000.00, 0.00, 10000.00, 'Fund transfer from Distributor', datetime('now', '-7 days')),
(4, 4, 4, 'debit', 299.00, 10000.00, 9701.00, 'Recharge: Airtel 9123456789', datetime('now', '-5 days')),
(5, 4, 4, 'credit', 8.97, 9701.00, 9709.97, 'Commission: Airtel recharge', datetime('now', '-5 days')),
(6, 5, 5, 'credit', 7000.00, 0.00, 7000.00, 'Fund transfer from Distributor', datetime('now', '-6 days')),
(7, 5, 5, 'debit', 450.00, 7000.00, 6550.00, 'Recharge: Tata Play TP12345678', datetime('now', '-3 days')),
(8, 6, 6, 'credit', 5000.00, 0.00, 5000.00, 'Fund transfer from Distributor', datetime('now', '-5 days')),
(9, 7, 7, 'credit', 8000.00, 0.00, 8000.00, 'Fund transfer from Distributor', datetime('now', '-5 days')),
(10, 8, 8, 'credit', 3500.00, 0.00, 3500.00, 'Fund transfer from Distributor', datetime('now', '-4 days'));

-- Payment Requests
INSERT OR IGNORE INTO payment_requests (id, user_id, amount, payment_mode, reference_no, bank_name, status, created_at)
VALUES
(1, 4, 5000.00, 'bank_transfer', 'NEFT20260301001', 'SBI', 'approved', datetime('now', '-8 days')),
(2, 5, 3000.00, 'upi', 'UPI20260305001', 'HDFC', 'approved', datetime('now', '-6 days')),
(3, 7, 4000.00, 'bank_transfer', 'IMPS20260310001', 'ICICI', 'approved', datetime('now', '-5 days')),
(4, 6, 2000.00, 'cash', 'CASH20260315001', 'PNB', 'pending', datetime('now', '-2 days')),
(5, 8, 1500.00, 'upi', 'UPI20260320001', 'Kotak', 'pending', datetime('now', '-1 day')),
(6, 4, 5000.00, 'bank_transfer', 'RTGS20260322001', 'SBI', 'pending', datetime('now', '-6 hours'));

-- Support Tickets
INSERT OR IGNORE INTO support_tickets (id, user_id, subject, message, status, created_at)
VALUES
(1, 4, 'Recharge not received', 'I did a recharge of Rs 299 to 9123456789 but the customer says it was not received. Please check.', 'open', datetime('now', '-4 days')),
(2, 5, 'Commission query', 'Why is my DTH commission only 3%? Earlier it was 3.5%. Please clarify.', 'resolved', datetime('now', '-3 days')),
(3, 7, 'Failed recharge refund', 'Transaction TXN009 failed but amount was debited. Please refund.', 'open', datetime('now', '-12 hours')),
(4, 6, 'KYC document update', 'I want to update my Aadhaar card details in KYC. How to proceed?', 'open', datetime('now', '-1 day')),
(5, 2, 'Distributor panel issue', 'The retailer list is not loading properly. Getting blank page sometimes.', 'open', datetime('now', '-6 hours'));
