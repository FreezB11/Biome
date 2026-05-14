import rateLimit from "express-rate-limit";

export function createRateLimiter() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const limit = Number(process.env.RATE_LIMIT_MAX ?? 120);

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
}

