/* ============================================
   DOMINGO SECURITY HELPERS
   Server-side only. Shared by API routes.
   - safe error messages (never leak internals)
   - CORS headers for public endpoints
   - OPTIONS preflight handling
   - basic in-memory rate limiting
   ============================================ */

export const MAX_HERO_NAME = 80;
export const MAX_IMAGE_URL = 2048;
export const MAX_NAME = 60;
export const MAX_PHONE = 40;
export const MAX_NOTE = 500;
export const MAX_PRODUCT = 80;
export const MAX_REVIEW_TEXT = 500;
export const MAX_QUANTITY = 20;

export const CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

/** CORS for public read/write endpoints consumed cross-origin by the GitHub Pages site. */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": CACHE,
  };
}

/** Standard cache + security headers on every API response. */
export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": CACHE,
  };
}

/** Return a safe user-facing message; the real error is logged server-side. */
export function safeError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    console.error("[domingo] " + fallback + ":", error.message);
  } else {
    console.error("[domingo] " + fallback, error);
  }
  return fallback;
}

/** Best-effort client identifier for rate limiting (Vercel x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/* ---------- In-memory rate limiting ---------- */
// NOTE: serverless instances are ephemeral, so this is per-instance best
// effort — first line of defense, not a substitute for infra-level limits.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}