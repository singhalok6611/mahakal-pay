const path = require('path');
const fs = require('fs');

// Detect environment
const isVercel = !!process.env.VERCEL;
let db;

if (isVercel) {
  // Use sql.js (pure JS) on Vercel serverless
  const initSqlJs = require('sql.js');
  const dbPath = '/tmp/mahakal.db';

  // Synchronous-ish init using a cached promise
  let dbReady = false;
  let dbInstance = null;

  // Create a synchronous wrapper around sql.js
  const sqlPromise = initSqlJs().then(SQL => {
    let data = null;
    try {
      if (fs.existsSync(dbPath)) {
        data = fs.readFileSync(dbPath);
      }
    } catch (e) {}

    if (data) {
      dbInstance = new SQL.Database(data);
    } else {
      dbInstance = new SQL.Database();
    }

    // Run migrations
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.run(schema);

    // Run seed
    const seedPath = path.join(__dirname, '../db/seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    dbInstance.run(seed);

    // Save to disk
    const buffer = dbInstance.export();
    fs.writeFileSync(dbPath, Buffer.from(buffer));

    dbReady = true;
    return dbInstance;
  });

  // Create a proxy that wraps sql.js with better-sqlite3 compatible API
  const handler = {
    get(target, prop) {
      if (prop === '_sqlPromise') return sqlPromise;
      if (prop === '_isReady') return dbReady;
      if (prop === '_getInstance') return () => dbInstance;

      if (prop === 'prepare') {
        return (sql) => {
          return {
            get(...params) {
              if (!dbInstance) throw new Error('DB not ready');
              const stmt = dbInstance.prepare(sql);
              if (params.length > 0) stmt.bind(params);
              if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return row;
              }
              stmt.free();
              return undefined;
            },
            all(...params) {
              if (!dbInstance) throw new Error('DB not ready');
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
              if (!dbInstance) throw new Error('DB not ready');
              dbInstance.run(sql, params);
              // Save after writes
              const buffer = dbInstance.export();
              fs.writeFileSync(dbPath, Buffer.from(buffer));
              return {
                lastInsertRowid: dbInstance.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0],
                changes: dbInstance.getRowsModified(),
              };
            },
          };
        };
      }

      if (prop === 'exec') {
        return (sql) => {
          if (!dbInstance) throw new Error('DB not ready');
          dbInstance.run(sql);
          const buffer = dbInstance.export();
          fs.writeFileSync(dbPath, Buffer.from(buffer));
        };
      }

      if (prop === 'pragma') {
        return () => {}; // no-op for sql.js
      }

      if (prop === 'transaction') {
        return (fn) => {
          return (...args) => {
            if (!dbInstance) throw new Error('DB not ready');
            dbInstance.run('BEGIN TRANSACTION');
            try {
              const result = fn(...args);
              dbInstance.run('COMMIT');
              const buffer = dbInstance.export();
              fs.writeFileSync(dbPath, Buffer.from(buffer));
              return result;
            } catch (e) {
              dbInstance.run('ROLLBACK');
              throw e;
            }
          };
        };
      }

      return undefined;
    }
  };

  db = new Proxy({}, handler);
} else {
  // Use better-sqlite3 for local development
  const Database = require('better-sqlite3');

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

  // Run migrations
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // Run seed
  const seedPath = path.join(__dirname, '../db/seed.sql');
  const seed = fs.readFileSync(seedPath, 'utf8');
  db.exec(seed);
}

module.exports = db;
