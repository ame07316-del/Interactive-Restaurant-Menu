import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server-auth";
import { getAdminOverview, markNotificationsRead } from "@/lib/server-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  return NextResponse.json(await getAdminOverview(), { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  await markNotificationsRead();
  return NextResponse.json({ ok: true });
}
