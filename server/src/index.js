require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize database (runs migrations + seed)
require('./config/db');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
// Capture raw body so payment webhook signature verification works
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/distributor', require('./routes/distributor.routes'));
app.use('/api/retailer', require('./routes/retailer.routes'));
app.use('/api', require('./routes/public.routes'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Mahakal server running on port ${PORT}`);
});
