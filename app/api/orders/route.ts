import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/server-database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const result = await createOrder(await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تسجيل الطلب" }, { status: 400 });
  }
}
