const rateLimit = require("express-rate-limit");

// Generic API-wide ceiling — generous, just there to blunt abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limit on signin specifically — this is the brute-force target.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

// Connecting/testing a database does a real network call outward — cheap
// to abuse as an SSRF probing tool if left unlimited.
const dbTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many connection attempts. Please wait a few minutes." },
});

module.exports = { apiLimiter, authLimiter, dbTestLimiter };
