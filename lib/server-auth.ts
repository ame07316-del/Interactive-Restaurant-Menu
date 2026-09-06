import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "restaurant_admin_session";
const SESSION_VALUE = "restaurant-admin-v1";

const supabaseUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = () => (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const isSupabaseAuthConfigured = () => Boolean(supabaseUrl() && supabaseKey());

function secret() {
  return process.env.SESSION_SECRET || "development-only-change-session-secret";
}

export function sessionToken() {
  return `${SESSION_VALUE}.${createHmac("sha256", secret()).update(SESSION_VALUE).digest("hex")}`;
}

function hasValidFallbackCookie(request: NextRequest) {
  const actual = request.cookies.get(ADMIN_COOKIE)?.value ?? "";
  const expected = sessionToken();
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

/**
 * في الإنتاج يتحقق من access token مباشرة مع Supabase Auth.
 * لو Supabase غير مُعدّ فقط، يسمح بجلسة PIN المحلية كـ fallback للتطوير.
 */
export async function isAdminRequest(request: NextRequest) {
  if (!isSupabaseAuthConfigured()) return hasValidFallbackCookie(request);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  try {
    const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: { authorization, apikey: supabaseKey() },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const user = (await response.json()) as { id?: string; email?: string };
    return Boolean(user.id && user.email);
  } catch {
    return false;
  }
}

export function safePinEquals(actual: string, expected: string) {
  const a = Buffer.from(actual.trim());
  const b = Buffer.from(expected.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}
