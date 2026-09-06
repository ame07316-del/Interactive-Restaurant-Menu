import "server-only";

import type { NextRequest } from "next/server";

/**
 * مصادقة الأدمن على السيرفر.
 *
 * الطريقة الوحيدة المقبولة: Supabase Auth access token بيتبعت في هيدر
 * `Authorization: Bearer <token>` والسيرفر بيتحقق منه مباشرةً عند Supabase.
 * مفيش كوكيز جلسة محلية، مفيش رقم سري، ومفيش أي fallback —
 * أي طلب من غير توكن صالح بيرجع 401.
 */

const supabaseUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const supabaseKey = () => (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

export interface AdminUser {
  id: string;
  email: string;
}

/** نتيجة التحقق: يوزر صالح، أو null، أو سبب الرفض */
export type AdminCheck =
  | { ok: true; user: AdminUser }
  | { ok: false; status: 401 | 503; error: string };

export const MISSING_SERVER_ENV = "إعدادات Supabase ناقصة على السيرفر";
export const UNAUTHORIZED = "غير مصرّح — سجّل الدخول من لوحة التحكم";

/** كاش قصير للتحقق عشان منضربش Supabase مع كل طلب */
const TOKEN_CACHE_TTL = 30_000;
const tokenCache = new Map<string, { user: AdminUser | null; expiresAt: number }>();

export function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 20 ? token : null;
}

async function verifyToken(token: string): Promise<AdminUser | null> {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  let user: AdminUser | null = null;
  try {
    const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: { authorization: `Bearer ${token}`, apikey: supabaseKey() },
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { id?: string; email?: string };
      if (payload.id && payload.email) user = { id: payload.id, email: payload.email };
    }
  } catch {
    // فشل الشبكة = رفض الطلب (fail closed)
    user = null;
  }

  if (tokenCache.size > 500) tokenCache.clear();
  tokenCache.set(token, { user, expiresAt: Date.now() + (user ? TOKEN_CACHE_TTL : 2_000) });
  return user;
}

/** التحقق الكامل من توكن الأدمن */
export async function checkAdmin(token: string | null): Promise<AdminCheck> {
  if (!isSupabaseAuthConfigured()) return { ok: false, status: 503, error: MISSING_SERVER_ENV };
  if (!token) return { ok: false, status: 401, error: UNAUTHORIZED };
  const user = await verifyToken(token);
  if (!user) return { ok: false, status: 401, error: UNAUTHORIZED };
  return { ok: true, user };
}

/** true لو الطلب من أدمن مسجّل دخول بتوكن Supabase صالح */
export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  return (await checkAdmin(bearerToken(request))).ok;
}

/** يوزر الأدمن من الطلب — null لو غير مصرّح */
export async function requireAdminUser(request: NextRequest): Promise<AdminUser | null> {
  const result = await checkAdmin(bearerToken(request));
  return result.ok ? result.user : null;
}
