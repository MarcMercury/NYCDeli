// Simple in-memory rate limiter for API routes
// Suitable for small-scale deployments (~70 campers)

const store = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key)
  }
}, 60_000)

interface RateLimitResult {
  success: boolean
  remaining: number
  response?: Response
}

/**
 * Check rate limit for a given key (e.g. IP or user ID).
 * @param key Unique identifier for the client
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number = 20, windowMs: number = 60_000): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  entry.count++
  if (entry.count > limit) {
    return {
      success: false,
      remaining: 0,
      response: Response.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } }
      ),
    }
  }

  return { success: true, remaining: limit - entry.count }
}

/** Extract client identifier from request (IP or fallback) */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return ip
}

// --- Daily spending caps for AI API routes ---

const dailyCounts = new Map<string, { count: number; date: string }>()

function todayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD in UTC
}

/**
 * Check daily usage cap for a given service.
 * @param service Identifier for the service (e.g. 'openai', 'meshy', 'dalle')
 * @param maxPerDay Max calls allowed per day
 * @returns { allowed: boolean, used: number, response?: Response }
 */
export function dailyCap(service: string, maxPerDay: number): { allowed: boolean; used: number; response?: Response } {
  const today = todayKey()
  const entry = dailyCounts.get(service)

  if (!entry || entry.date !== today) {
    dailyCounts.set(service, { count: 1, date: today })
    return { allowed: true, used: 1 }
  }

  entry.count++
  if (entry.count > maxPerDay) {
    return {
      allowed: false,
      used: entry.count,
      response: Response.json(
        { error: `Daily limit reached for ${service}. Try again tomorrow.` },
        { status: 429 }
      ),
    }
  }

  return { allowed: true, used: entry.count }
}
