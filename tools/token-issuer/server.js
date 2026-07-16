// Simple Token Issuer (Node + Express)
// - Signs HS256 JWTs using BACKEND_JWT_SECRET
// - Protects mint endpoint with ISSUER_API_KEY
// - Small, audited surface area for M2M token minting

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const PORT = process.env.PORT || 3000;
const ISSUER_API_KEY = process.env.ISSUER_API_KEY; // protect the mint endpoint
const BACKEND_JWT_SECRET = process.env.BACKEND_JWT_SECRET; // signing secret

if (!ISSUER_API_KEY) {
  console.warn('ISSUER_API_KEY not configured. Mint endpoint will be disabled.');
}
if (!BACKEND_JWT_SECRET) {
  console.warn('BACKEND_JWT_SECRET not configured. Tokens cannot be signed.');
}

// Rate limit the mint endpoint to prevent abuse
const mintLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// Mint endpoint - protected by ISSUER_API_KEY
// POST /mint { sub: string, expires_in: seconds (optional, default 300), scope: string|string[] (optional) }
app.post('/mint', mintLimiter, (req, res) => {
  if (!ISSUER_API_KEY || !BACKEND_JWT_SECRET) return res.status(503).json({ error: 'Issuer not configured' });

  const provided = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const alt = req.headers['x-issuer-key'] || '';
  if (provided !== ISSUER_API_KEY && alt !== ISSUER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sub, expires_in = 300, scope } = req.body || {};
  if (!sub) return res.status(400).json({ error: 'Missing sub (subject) in body' });
  const payload = { sub };
  if (scope) payload.scope = scope;

  // Limit maximum lifetime to prevent long-lived tokens; max 24h
  const maxLifetime = 24 * 60 * 60; // 86400 seconds
  const safeExpires = Math.min(Number(expires_in) || 300, maxLifetime);

  try {
    const token = jwt.sign(payload, BACKEND_JWT_SECRET, { algorithm: 'HS256', expiresIn: safeExpires });
    return res.json({ token, expires_in: safeExpires });
  } catch (err) {
    console.error('Failed to sign token', err);
    return res.status(500).json({ error: 'Failed to sign token' });
  }
});

app.listen(PORT, () => {
  console.log(`Token issuer listening on port ${PORT}`);
});
