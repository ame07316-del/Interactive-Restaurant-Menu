import { NextRequest, NextResponse } from "next/server";
import { getMenu, replaceMenu, StoreError } from "@/lib/server-database";
import { bearerToken, checkAdmin } from "@/lib/server-auth";
import { rateLimit, getClientIp, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** قراءة القائمة — عامة لكل العملاء (ولو معاك توكن أدمن صالح بتتزامن بيانات البداية) */
export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  const check = await checkAdmin(token);
  try {
    return NextResponse.json(await getMenu(check.ok ? token : null), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof StoreError ? error.status : 500;
    const message = status >= 500 ? "تعذّر قراءة القائمة" : error instanceof Error ? error.message : "تعذّر قراءة القائمة";
    return NextResponse.json({ error: message }, { status });
  }
}

/** تعديل القائمة — للأدمن فقط بعد التحقق من Supabase access token على السيرفر */
export async function PUT(request: NextRequest) {
  const token = bearerToken(request);
  const check = await checkAdmin(token);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  // Rate limiting للأدمن (20 حفظ / دقيقة لكل IP + توكن)
  const ip = getClientIp(request);
  const rl = rateLimit(`menu-save:${ip}:${check.ok ? token?.slice(-8) : "anon"}`, LIMITS.menuSave);
  if (!rl.success) {
    return NextResponse.json(
      { error: "محاولات حفظ كثيرة - حاول بعد دقيقة" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    if (JSON.stringify(body).length > 4_000_000) {
      return NextResponse.json({ error: "البيانات كبيرة جداً (الحد 4MB)" }, { status: 413 });
    }
    const menu = await replaceMenu(body, token);
    return NextResponse.json(menu, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof StoreError ? error.status : 400;
    const message = status >= 500 ? "خطأ في الخادم" : error instanceof Error ? error.message : "بيانات القائمة غير صالحة";
    return NextResponse.json({ error: message }, { status });
  }
}
