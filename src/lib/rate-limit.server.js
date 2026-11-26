/**
 * Small fixed-window rate limiter. Cloudflare isolates do not share memory, so this
 * bounds abuse per isolate (the layer closest to the attacker); the platform's own
 * edge protections sit in front of it.
 */
const buckets = new Map();

function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [key, entry] of buckets) if (entry.resetAt <= now) buckets.delete(key);
}

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  sweep(now);
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

export function clientIp(request) {
  if (!request) return "unknown";
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    (headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}
