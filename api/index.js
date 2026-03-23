const path = require('path');

// Set DB path to /tmp for Vercel serverless
process.env.DB_PATH = '/tmp/mahakal.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mahakal-vercel-secret-2024';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('../server/src/middleware/errorHandler');

// Initialize database
require('../server/src/config/db');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', require('../server/src/routes/auth.routes'));
app.use('/api/admin', require('../server/src/routes/admin.routes'));
app.use('/api/distributor', require('../server/src/routes/distributor.routes'));
app.use('/api/retailer', require('../server/src/routes/retailer.routes'));
app.use('/api', require('../server/src/routes/public.routes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

module.exports = app;
