type RateLimitPolicy = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const requests = new Map<string, number[]>();

/**
 * A small server-side guard for paid AI routes. It is deliberately lightweight
 * for the hackathon deployment; a production app would use a shared store.
 */
export function rateLimitRequest(
  request: Request,
  scope: string,
  { maxRequests, windowMs }: RateLimitPolicy
): RateLimitResult {
  const client = getClientAddress(request);
  const key = `${scope}:${client}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (requests.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= maxRequests) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    };
  }

  recent.push(now);
  requests.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

function getClientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
