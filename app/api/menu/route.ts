import { NextRequest, NextResponse } from "next/server";
import { getMenu, replaceMenu } from "@/lib/server-database";
import { isAdminRequest } from "@/lib/server-auth";
import type { MenuData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const menu = await getMenu();
  const data = (await isAdminRequest(request)) ? menu : { ...menu, admin: { ...menu.admin, pin: "" } };
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const menu = (await request.json()) as MenuData;
    return NextResponse.json(await replaceMenu(menu));
  } catch {
    return NextResponse.json({ error: "بيانات القائمة غير صالحة" }, { status: 400 });
  }
}
