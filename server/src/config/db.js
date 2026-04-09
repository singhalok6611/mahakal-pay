const path = require('path');
const fs = require('fs');

const isVercel = !!process.env.VERCEL;
let db;

// Idempotent migrations for existing databases.
// SQLite's `CREATE TABLE IF NOT EXISTS` won't add columns to an already-existing
// table, so any column addition has to go through ALTER TABLE here. Each step is
// wrapped so re-running on an already-migrated DB is a no-op.
const MIGRATIONS = [
  // users.pan
  { name: 'users.pan',             sql: 'ALTER TABLE users ADD COLUMN pan TEXT' },
  { name: 'users.pan_index',       sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pan ON users(pan) WHERE pan IS NOT NULL' },
  // users.approval_status — default 'approved' so existing rows stay valid;
  // CHECK constraint is enforced at the model layer for migrated DBs.
  { name: 'users.approval_status', sql: "ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'" },
  { name: 'users.approval_index',  sql: 'CREATE INDEX IF NOT EXISTS idx_users_approval ON users(approval_status)' },
];

function runMigrations(target) {
  for (const m of MIGRATIONS) {
    try {
      target.exec(m.sql);
    } catch (err) {
      // "duplicate column name" / "index ... already exists" → already migrated, ignore.
      const msg = String(err && err.message || err);
      if (/duplicate column|already exists/i.test(msg)) continue;
      // Anything else is unexpected — surface it loudly.
      console.error(`[db migration ${m.name}] failed:`, msg);
      throw err;
    }
  }
}

if (isVercel) {
  // Use sql.js (pure JavaScript SQLite) on Vercel serverless
  const initSqlJs = require('sql.js');
  const dbPath = '/tmp/mahakal.db';

  let dbInstance = null;
  let initialized = false;

  const initPromise = initSqlJs().then(SQL => {
    let data = null;
    try {
      if (fs.existsSync(dbPath)) {
        data = fs.readFileSync(dbPath);
      }
    } catch (e) {}

    dbInstance = data ? new SQL.Database(data) : new SQL.Database();

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    dbInstance.run(schema);

    // Run idempotent ALTER migrations for already-existing databases
    runMigrations({ exec: (sql) => dbInstance.run(sql) });

    // Run seed
    const seed = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');
    dbInstance.run(seed);

    // Save
    fs.writeFileSync(dbPath, Buffer.from(dbInstance.export()));
    initialized = true;
    return dbInstance;
  });

  function save() {
    if (dbInstance) {
      fs.writeFileSync(dbPath, Buffer.from(dbInstance.export()));
    }
  }

  db = {
    _initPromise: initPromise,
    get _ready() { return initialized; },

    pragma() {},

    prepare(sql) {
      return {
        get(...params) {
          if (!dbInstance) throw new Error('DB not initialized');
          const stmt = dbInstance.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          let row;
          if (stmt.step()) {
            row = stmt.getAsObject();
          }
          stmt.free();
          return row || undefined;
        },
        all(...params) {
          if (!dbInstance) throw new Error('DB not initialized');
          const results = [];
          const stmt = dbInstance.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
        run(...params) {
          if (!dbInstance) throw new Error('DB not initialized');
          dbInstance.run(sql, params);
          save();
          const lastId = dbInstance.exec("SELECT last_insert_rowid()");
          return {
            lastInsertRowid: lastId[0]?.values[0]?.[0] || 0,
            changes: dbInstance.getRowsModified(),
          };
        },
      };
    },

    exec(sql) {
      if (!dbInstance) throw new Error('DB not initialized');
      dbInstance.run(sql);
      save();
    },

    transaction(fn) {
      return (...args) => {
        if (!dbInstance) throw new Error('DB not initialized');
        dbInstance.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          dbInstance.run('COMMIT');
          save();
          return result;
        } catch (e) {
          dbInstance.run('ROLLBACK');
          throw e;
        }
      };
    },
  };
} else {
  // Local dev: use better-sqlite3
  let Database;
  try {
    const moduleName = 'better-sqlite3';
    Database = require(moduleName);
  } catch (e) {
    throw new Error('better-sqlite3 not available. Set VERCEL=1 to use sql.js instead.');
  }

  let dbPath;
  if (process.env.DB_PATH && path.isAbsolute(process.env.DB_PATH)) {
    dbPath = process.env.DB_PATH;
  } else {
    dbPath = path.resolve(__dirname, '../../', process.env.DB_PATH || './data/mahakal.db');
  }

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  db.exec(schema);

  // Run idempotent ALTER migrations for already-existing databases
  runMigrations(db);

  const seed = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');
  db.exec(seed);
}

module.exports = db;
