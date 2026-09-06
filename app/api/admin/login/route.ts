import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, safePinEquals, sessionToken } from "@/lib/server-auth";
import { getMenu } from "@/lib/server-database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { pin, remember } = (await request.json()) as { pin?: string; remember?: boolean };
  const menu = await getMenu();
  const expected = process.env.ADMIN_PIN || menu.admin.pin || "1234";
  if (!pin || !safePinEquals(pin, expected)) {
    return NextResponse.json({ error: "الرقم السري غير صحيح" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
  });
  return response;
}
