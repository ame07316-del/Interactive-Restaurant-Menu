import { NextRequest, NextResponse } from "next/server";
import { bearerToken, checkAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * التحقق من جلسة الأدمن على السيرفر.
 * بيرجّع 200 + بيانات اليوزر لو الـ access token صالح عند Supabase،
 * و401/503 غير كده. مفيش كوكيز أو جلسات محلية.
 */
export async function GET(request: NextRequest) {
  const check = await checkAdmin(bearerToken(request));
  if (!check.ok) {
    return NextResponse.json({ authenticated: false, error: check.error }, { status: check.status });
  }
  return NextResponse.json(
    { authenticated: true, email: check.user.email, userId: check.user.id },
    { headers: { "cache-control": "no-store" } },
  );
}
