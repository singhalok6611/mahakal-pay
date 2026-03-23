process.env.VERCEL = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mahakal-vercel-secret-2024';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('../server/src/middleware/errorHandler');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
  try {
    const db = require('../server/src/config/db');
    if (db._sqlPromise && !db._isReady) {
      await db._sqlPromise;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database initialization failed: ' + err.message });
  }
});

// API Routes
app.use('/api/auth', require('../server/src/routes/auth.routes'));
app.use('/api/admin', require('../server/src/routes/admin.routes'));
app.use('/api/distributor', require('../server/src/routes/distributor.routes'));
app.use('/api/retailer', require('../server/src/routes/retailer.routes'));
app.use('/api', require('../server/src/routes/public.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

module.exports = app;
