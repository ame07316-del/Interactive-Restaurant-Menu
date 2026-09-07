/**
 * Rate limiting بسيط في الذاكرة للـ demo/portfolio
 * للإنتاج الحقيقي يُفضل Upstash Redis
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// تنظيف دوري كل 5 دقائق
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitConfig {
  /** العدد المسموح */
  limit: number;
  /** المدة بالمللي ثانية */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (bucket.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { success: true, remaining: config.limit - bucket.count, resetAt: bucket.resetAt };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

// إعدادات جاهزة للـ demo
export const LIMITS = {
  /** 5 طلبات / دقيقة لكل IP */
  orders: { limit: 5, windowMs: 60_000 },
  /** 10 محاولات دخول / 15 دقيقة */
  auth: { limit: 10, windowMs: 15 * 60_000 },
  /** 20 تعديل قائمة / دقيقة للأدمن */
  menuSave: { limit: 20, windowMs: 60_000 },
} as const;
