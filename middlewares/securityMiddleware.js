const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Basic rate limiter to protect authentication APIs
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// General rate limiter for property postings/comments
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Submission rate limit reached. Please try again later.'
  }
});

// Configure Helmet with custom rules for standard client-side CDNs (like font and icon CDNs)
const secureHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://unpkg.com", "https://a.tile.openstreetmap.org", "https://b.tile.openstreetmap.org", "https://c.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://nominatim.openstreetmap.org"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"]
    }
  }
});

// Simple sanitization helper to strip HTML tags (XSS protection)
function sanitizeInput(req, res, next) {
  const sanitize = (value) => {
    if (typeof value === 'string') {
      // Remove scripts and HTML tags completely
      return value.replace(/<[^>]*>/g, '').trim();
    }
    if (value && typeof value === 'object') {
      for (let key in value) {
        value[key] = sanitize(value[key]);
      }
    }
    return value;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
}

module.exports = {
  authLimiter,
  uploadLimiter,
  secureHeaders,
  sanitizeInput
};
