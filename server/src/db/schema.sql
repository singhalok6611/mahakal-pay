-- Mahakal Recharge Platform - Database Schema

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id       INTEGER REFERENCES users(id),
    role            TEXT NOT NULL CHECK(role IN ('admin','distributor','retailer')),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT NOT NULL UNIQUE,
    pan             TEXT,
    password_hash   TEXT NOT NULL,
    shop_name       TEXT,
    address         TEXT,
    city            TEXT,
    state           TEXT,
    pincode         TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','blocked')),
    kyc_status      TEXT NOT NULL DEFAULT 'pending' CHECK(kyc_status IN ('pending','approved','rejected')),
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK(approval_status IN ('pending_approval','approved','rejected')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
-- idx_users_pan and idx_users_approval are created by db.js migrations after
-- ALTER TABLE adds the columns on already-existing databases.

CREATE TABLE IF NOT EXISTS wallets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id),
    balance         REAL NOT NULL DEFAULT 0.00,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id       INTEGER NOT NULL REFERENCES wallets(id),
    user_id         INTEGER NOT NULL REFERENCES users(id),
    type            TEXT NOT NULL CHECK(type IN ('credit','debit')),
    amount          REAL NOT NULL,
    balance_before  REAL NOT NULL,
    balance_after   REAL NOT NULL,
    reference_type  TEXT,
    reference_id    INTEGER,
    description     TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_date ON wallet_transactions(created_at);

CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    service_type    TEXT NOT NULL CHECK(service_type IN ('mobile','fastag','dth')),
    operator        TEXT NOT NULL,
    subscriber_id   TEXT NOT NULL,
    amount          REAL NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','processing','success','failed','refunded')),
    api_txn_id      TEXT,
    commission      REAL NOT NULL DEFAULT 0.00,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(created_at);

CREATE TABLE IF NOT EXISTS operators (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    code            TEXT NOT NULL UNIQUE,
    service_type    TEXT NOT NULL CHECK(service_type IN ('mobile','fastag','dth')),
    logo_url        TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    commission_pct  REAL NOT NULL DEFAULT 0.00,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    document_type   TEXT NOT NULL,
    document_number TEXT NOT NULL,
    document_url    TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','approved','rejected')),
    remarks         TEXT,
    reviewed_by     INTEGER REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    amount          REAL NOT NULL,
    payment_mode    TEXT NOT NULL,
    reference_no    TEXT,
    bank_name       TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','approved','rejected')),
    approved_by     INTEGER REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    subject         TEXT NOT NULL,
    message         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'open'
                    CHECK(status IN ('open','in_progress','resolved','closed')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL,
    phone           TEXT,
    subject         TEXT NOT NULL,
    message         TEXT NOT NULL,
    is_read         INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens for JWT auth (rotating refresh token system)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    token_hash      TEXT NOT NULL UNIQUE,
    user_agent      TEXT,
    ip_address      TEXT,
    expires_at      DATETIME NOT NULL,
    revoked         INTEGER NOT NULL DEFAULT 0,
    replaced_by     INTEGER REFERENCES refresh_tokens(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash);

-- Razorpay payment orders (online wallet top-up)
CREATE TABLE IF NOT EXISTS payment_orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    gateway         TEXT NOT NULL DEFAULT 'razorpay',
    gateway_order_id TEXT NOT NULL UNIQUE,
    gateway_payment_id TEXT,
    amount          REAL NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'INR',
    status          TEXT NOT NULL DEFAULT 'created'
                    CHECK(status IN ('created','attempted','paid','failed','refunded')),
    method          TEXT,
    error_code      TEXT,
    error_description TEXT,
    raw_payload     TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

-- Platform fees - 1% auto-deducted to admin on every transaction
CREATE TABLE IF NOT EXISTS platform_fees (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    source_type     TEXT NOT NULL CHECK(source_type IN ('wallet_topup','recharge','transfer')),
    source_id       INTEGER NOT NULL,
    base_amount     REAL NOT NULL,
    fee_pct         REAL NOT NULL,
    fee_amount      REAL NOT NULL,
    admin_user_id   INTEGER NOT NULL REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_fees_user ON platform_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_date ON platform_fees(created_at);

-- Cyrus / external recharge API logs
CREATE TABLE IF NOT EXISTS recharge_api_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id  INTEGER REFERENCES transactions(id),
    provider        TEXT NOT NULL,
    request_payload TEXT,
    response_payload TEXT,
    http_status     INTEGER,
    error_message   TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recharge_logs_txn ON recharge_api_logs(transaction_id);

-- In-app notifications (admin gets one per retailer/distributor txn, etc.)
CREATE TABLE IF NOT EXISTS notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    reference_type  TEXT,
    reference_id    INTEGER,
    is_read         INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at);

-- Wallet → bank/UPI withdrawal requests (admin approves, then wallet is debited)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    amount              REAL NOT NULL,
    method              TEXT NOT NULL CHECK(method IN ('bank','upi')),
    bank_account_name   TEXT,
    bank_account_number TEXT,
    bank_ifsc           TEXT,
    bank_name           TEXT,
    upi_id              TEXT,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','approved','rejected','processed','failed')),
    admin_remarks       TEXT,
    processed_by        INTEGER REFERENCES users(id),
    processed_at        DATETIME,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);

-- Password reset tokens (slice 7). Single-use, time-boxed. We store the
-- bcrypt-style hash of the token, never the raw token, so a DB leak alone
-- cannot be replayed against the reset endpoint.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      DATETIME NOT NULL,
    used_at         DATETIME,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens(token_hash);

-- Per-transaction commission split (slice 3).
-- On every successful retailer recharge we record one row that captures who
-- earned what: the retailer's gross commission, the distributor's override
-- (default 0.25% of the retailer commission) and the admin's override
-- (default 0.5% of the retailer commission). The wallet credits are written
-- in parallel into wallet_transactions; this table is the canonical join
-- target for the role-scoped All Transactions / Failed Transactions pages.
CREATE TABLE IF NOT EXISTS commission_splits (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id              INTEGER NOT NULL REFERENCES transactions(id),
    retailer_user_id            INTEGER NOT NULL REFERENCES users(id),
    retailer_commission_amount  REAL NOT NULL,
    distributor_user_id         INTEGER REFERENCES users(id),
    distributor_share_pct       REAL NOT NULL DEFAULT 0,
    distributor_share_amount    REAL NOT NULL DEFAULT 0,
    admin_user_id               INTEGER NOT NULL REFERENCES users(id),
    admin_share_pct             REAL NOT NULL DEFAULT 0,
    admin_share_amount          REAL NOT NULL DEFAULT 0,
    created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commission_split_txn ON commission_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_commission_split_retailer ON commission_splits(retailer_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_split_distributor ON commission_splits(distributor_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_split_date ON commission_splits(created_at);
