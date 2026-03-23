const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Support both local dev and Vercel serverless (/tmp)
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

const db = new Database(dbPath);

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

module.exports = db;
