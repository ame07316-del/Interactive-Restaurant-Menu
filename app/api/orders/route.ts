import { NextRequest, NextResponse } from "next/server";
import { createOrder, StoreError } from "@/lib/server-database";
import { rateLimit, getClientIp, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * تسجيل طلب جديد في الباك إند: يتحقق من الكمية المتاحة،
 * يخصم المخزون، وينشئ تنبيه نقص مخزون عند الوصول للحد المحدد.
 * محمي بـ Rate Limiting (5 طلبات / دقيقة لكل IP) للـ portfolio demo
 */
export async function POST(request: NextRequest) {
  // Rate limiting - demo portfolio protection
  const ip = getClientIp(request);
  const rl = rateLimit(`orders:${ip}`, LIMITS.orders);
  if (!rl.success) {
    return NextResponse.json(
      { error: "طلبات كثيرة - حاول بعد دقيقة" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    const body = await request.json();
    // تحقق سريع من حجم الحمولة (منع DoS)
    if (JSON.stringify(body).length > 100_000) {
      return NextResponse.json({ error: "بيانات الطلب كبيرة جداً" }, { status: 413 });
    }
    const result = await createOrder(body);
    return NextResponse.json(result, {
      status: 201,
      headers: { "X-RateLimit-Remaining": String(rl.remaining) },
    });
  } catch (error) {
    const status = error instanceof StoreError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تسجيل الطلب" },
      { status },
    );
  }
}
