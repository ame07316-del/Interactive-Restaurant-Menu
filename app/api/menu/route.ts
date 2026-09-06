import { NextRequest, NextResponse } from "next/server";
import { getMenu, replaceMenu, StoreError } from "@/lib/server-database";
import { bearerToken, checkAdmin } from "@/lib/server-auth";

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذّر قراءة القائمة" },
      { status },
    );
  }
}

/** تعديل القائمة — للأدمن فقط بعد التحقق من Supabase access token على السيرفر */
export async function PUT(request: NextRequest) {
  const token = bearerToken(request);
  const check = await checkAdmin(token);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const menu = await replaceMenu(await request.json(), token);
    return NextResponse.json(menu, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof StoreError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "بيانات القائمة غير صالحة" },
      { status },
    );
  }
}
