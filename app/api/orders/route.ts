import { NextRequest, NextResponse } from "next/server";
import { createOrder, StoreError } from "@/lib/server-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * تسجيل طلب جديد في الباك إند: يتحقق من الكمية المتاحة،
 * يخصم المخزون، وينشئ تنبيه نقص مخزون عند الوصول للحد المحدد.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await createOrder(await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = error instanceof StoreError ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تسجيل الطلب" },
      { status },
    );
  }
}
