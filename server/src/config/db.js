const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const { createClient } = require('@libsql/client');

// ─────────────────────────────────────────────────────────────
// libSQL backend (Turso in prod, local libSQL file in dev).
//
// All call sites use the same async wrapper:
//   await db.prepare(sql).get(...args)
//   await db.prepare(sql).all(...args)
//   await db.prepare(sql).run(...args)
//   await db.transaction(async () => { ... })()
//
// Transactions use AsyncLocalStorage so that nested model calls inside an
// outer db.transaction(fn) all route through the same libSQL transaction
// object — mirroring better-sqlite3's nested-savepoint semantics in spirit.
// ─────────────────────────────────────────────────────────────

const txContext = new AsyncLocalStorage();

function buildClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (url && token) {
    // Production / Vercel: talk to Turso over HTTPS.
    return createClient({ url, authToken: token, intMode: 'number' });
  }

  // Local fallback: a libSQL file on disk. Same client API, no network.
  // Lets you run the server without a Turso account during dev.
  const dbPath = process.env.DB_PATH && path.isAbsolute(process.env.DB_PATH)
    ? process.env.DB_PATH
    : path.resolve(__dirname, '../../', process.env.DB_PATH || './data/mahakal.db');

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  return createClient({ url: `file:${dbPath}`, intMode: 'number' });
}

const client = buildClient();

// ─────────────────────────────────────────────────────────────
// Idempotent ALTER migrations for already-existing databases.
// SQLite's CREATE TABLE IF NOT EXISTS won't add columns to an existing
// table, so each column addition runs through ALTER TABLE here. Each step
// is wrapped so re-running on an already-migrated DB is a no-op.
// ─────────────────────────────────────────────────────────────
const MIGRATIONS = [
  { name: 'users.pan',                          sql: 'ALTER TABLE users ADD COLUMN pan TEXT' },
  { name: 'users.pan_index',                    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pan ON users(pan) WHERE pan IS NOT NULL' },
  { name: 'users.approval_status',              sql: "ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'" },
  { name: 'users.approval_index',               sql: 'CREATE INDEX IF NOT EXISTS idx_users_approval ON users(approval_status)' },
  // slice 9 — admin audit log
  { name: 'admin_actions.table',                sql: `CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    payload TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )` },
  { name: 'admin_actions.idx_admin',            sql: 'CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_user_id)' },
  { name: 'admin_actions.idx_target',           sql: 'CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id)' },
  { name: 'admin_actions.idx_date',             sql: 'CREATE INDEX IF NOT EXISTS idx_admin_actions_date ON admin_actions(created_at)' },
  // slice 6 — withdrawal payout reference
  { name: 'withdrawal_requests.bank_reference', sql: 'ALTER TABLE withdrawal_requests ADD COLUMN bank_reference TEXT' },
];

async function runMigrations() {
  for (const m of MIGRATIONS) {
    try {
      await client.execute(m.sql);
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/duplicate column|already exists/i.test(msg)) continue;
      console.error(`[db migration ${m.name}] failed:`, msg);
      throw err;
    }
  }
}

// Multi-statement runner. The SQL files in this repo never contain string
// literals with semicolons, so a simple split is safe. Line comments (--)
// are stripped first.
function splitStatements(sql) {
  return sql
    .split('\n')
    .map(line => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function execMultiple(sql) {
  for (const stmt of splitStatements(sql)) {
    await client.execute(stmt);
  }
}

// One-shot init: schema → migrations → seed. Every other DB call awaits
// initPromise before doing anything, so models don't need to know it exists.
const initPromise = (async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  await execMultiple(schema);
  await runMigrations();
  const seed = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');
  await execMultiple(seed);
})();

initPromise.catch(err => {
  console.error('[db init] failed:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────
// Statement wrapper. Routes through the active transaction if one is set
// in AsyncLocalStorage, otherwise straight through the client.
//
// libSQL rejects `undefined` bind values (better-sqlite3 used to silently
// coerce them to NULL). Convert undefined -> null here so the rest of the
// codebase can pass optional fields (e.g. shop_name, pincode) without
// having to defensively `?? null` every column.
// ─────────────────────────────────────────────────────────────
function normalizeArgs(params) {
  if (!params || params.length === 0) return params;
  return params.map(v => v === undefined ? null : v);
}

async function execStmt(sql, params) {
  await initPromise;
  const tx = txContext.getStore();
  const target = tx || client;
  return target.execute({ sql, args: normalizeArgs(params) });
}

function makeStatement(sql) {
  return {
    async get(...params) {
      const r = await execStmt(sql, params);
      return r.rows[0]; // undefined if no rows
    },
    async all(...params) {
      const r = await execStmt(sql, params);
      return r.rows;
    },
    async run(...params) {
      const r = await execStmt(sql, params);
      return {
        lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : 0,
        changes: r.rowsAffected || 0,
      };
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Public API.
// ─────────────────────────────────────────────────────────────
const db = {
  prepare(sql) {
    return makeStatement(sql);
  },

  async exec(sql) {
    await initPromise;
    await execMultiple(sql);
  },

  // db.transaction(fn) returns an async function. When invoked, it opens a
  // libSQL write transaction, stores it in AsyncLocalStorage, runs fn,
  // commits on success, rolls back on throw.
  //
  // Reentrancy: if fn itself calls db.transaction(fn2)(), the inner call
  // sees the existing tx in AsyncLocalStorage and skips opening a new one
  // — fn2 just runs inline within the outer atomic boundary. This matches
  // better-sqlite3's nested-savepoint behavior in practice.
  transaction(fn) {
    return async (...args) => {
      await initPromise;
      const existing = txContext.getStore();
      if (existing) {
        return fn(...args);
      }
      const tx = await client.transaction('write');
      try {
        const result = await txContext.run(tx, async () => fn(...args));
        await tx.commit();
        return result;
      } catch (err) {
        try { await tx.rollback(); } catch {}
        throw err;
      }
    };
  },
};

module.exports = db;
