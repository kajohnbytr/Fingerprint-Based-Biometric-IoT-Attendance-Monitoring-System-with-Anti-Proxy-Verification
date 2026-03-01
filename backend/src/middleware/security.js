const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { sanitize } = require('express-mongo-sanitize');

/**
 * Strict rate limit for login/register - prevents brute force.
 * 5 attempts per 15 minutes per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limit - 100 requests per 15 minutes.
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * NoSQL injection protection - sanitize req.body only (Express 5 has read-only req.query).
 * Must run AFTER express.json(). Strips $ and . from keys in req.body.
 */
function noSqlSanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  next();
}

/**
 * Apply security middleware to express app.
 * Call applySecurity BEFORE routes. noSqlSanitize should be applied AFTER express.json().
 */
function applySecurity(app) {
  app.use(helmet({
    contentSecurityPolicy: false, // SPA may need custom CSP
    crossOriginEmbedderPolicy: false,
  }));
}

module.exports = {
  authRateLimiter,
  apiRateLimiter,
  noSqlSanitize,
  applySecurity,
};
