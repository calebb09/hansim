// middleware/rateLimiter.js
import rateLimit from "express-rate-limit";

// Define a general rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: "Too many requests",
    details:
      "You have exceeded the maximum number of requests. Please wait 15 minutes and try again.",
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      msg: "Too many requests, try again later.",
    });
  },
  validate: {trustProxy: false},
});

// Define a login rate limiter (more strict)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each request to 3 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: "Too many requests",
    details:
      "You have exceeded the maximum number of requests. Please wait 15 minutes and try again.",
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      msg: "Too many requests, try again later.",
    });
  },
  validate: {trustProxy: false},
});
