const rateLimit = require('express-rate-limit');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter specifically for fetching video streams
const streamLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 15, // Limit each IP to 15 stream requests per minute (allows channel switching, prevents scraping)
  message: {
    success: false,
    message: 'Stream switching rate limit exceeded. Please wait a moment.',
  },
});

module.exports = { apiLimiter, streamLimiter };