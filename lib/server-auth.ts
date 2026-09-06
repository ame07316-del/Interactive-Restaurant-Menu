import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "restaurant_admin_session";
const SESSION_VALUE = "restaurant-admin-v1";

function secret() {
  return process.env.SESSION_SECRET || "development-only-change-session-secret";
}

export function sessionToken() {
  return `${SESSION_VALUE}.${createHmac("sha256", secret()).update(SESSION_VALUE).digest("hex")}`;
}

export function isAdminRequest(request: NextRequest) {
  const actual = request.cookies.get(ADMIN_COOKIE)?.value ?? "";
  const expected = sessionToken();
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function safePinEquals(actual: string, expected: string) {
  const a = Buffer.from(actual.trim());
  const b = Buffer.from(expected.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}
