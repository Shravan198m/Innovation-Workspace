const rateLimit = require("express-rate-limit");

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        message: message || "Too many requests. Please try again later.",
      });
    },
  });
}

const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: "Too many requests from this client.",
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many auth attempts. Please wait and try again.",
});

const projectWriteLimiter = createLimiter({
  windowMs: 1000,
  max: 2,
  message: "Project update rate limit exceeded. Try again shortly.",
});

const taskWriteLimiter = createLimiter({
  windowMs: 10 * 1000,
  max: 30,
  message: "Task update rate limit exceeded. Try again shortly.",
});

const chatMessageLimiter = createLimiter({
  windowMs: 10 * 1000,
  max: 20,
  message: "You are sending messages too fast.",
});

module.exports = {
  globalLimiter,
  authLimiter,
  projectWriteLimiter,
  taskWriteLimiter,
  chatMessageLimiter,
};
