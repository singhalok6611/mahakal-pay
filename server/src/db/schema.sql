-- Mahakal Recharge Platform - Database Schema

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id       INTEGER REFERENCES users(id),
    role            TEXT NOT NULL CHECK(role IN ('admin','distributor','retailer')),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    shop_name       TEXT,
    address         TEXT,
    city            TEXT,
    state           TEXT,
    pincode         TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','blocked')),
    kyc_status      TEXT NOT NULL DEFAULT 'pending' CHECK(kyc_status IN ('pending','approved','rejected')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

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
