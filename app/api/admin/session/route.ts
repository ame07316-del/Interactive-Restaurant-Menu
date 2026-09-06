import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminRequest } from "@/lib/server-auth";
import { getMenu } from "@/lib/server-database";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const menu = await getMenu();
  return NextResponse.json({ authenticated: !menu.admin.lockAdmin || isAdminRequest(request) });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
