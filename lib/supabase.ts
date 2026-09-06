import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * عميل Supabase للمتصفح — مسؤوليته الوحيدة هي مصادقة صاحب المطعم
 * (إيميل + باسورد من Authentication → Users) والحصول على access token.
 *
 * القراءة والكتابة على بيانات المطعم (القائمة / الطلبات / المخزون) بتتم عن طريق
 * API routes في الباك إند — شوف lib/server-database.ts.
 *
 * المفاتيح المستخدمة هنا هي المفاتيح العامة بس (NEXT_PUBLIC_):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * ممنوع منعاً باتاً استخدام service_role أو أي مفتاح سري في كود بيوصل للمتصفح.
 */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** الجدول اللي فيه صف القائمة */
export const MENU_TABLE = "menu_data";
/** الصف المنشور اللي بيقراه العملاء */
export const PUBLISHED_SLUG = "main";
/** جدول الطلبات */
export const ORDERS_TABLE = "orders";
/** جدول تنبيهات نقص المخزون */
export const NOTIFICATIONS_TABLE = "stock_notifications";
/** دالة تسجيل الطلب وخصم المخزون في قاعدة البيانات */
export const PLACE_ORDER_FUNCTION = "place_order";
/** مفتاح تخزين جلسة الدخول في المتصفح */
export const AUTH_STORAGE_KEY = "royal-menu:sb-auth:v1";

/** true لو متغيرات بيئة Supabase موجودة */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

let browserClient: SupabaseClient | null = null;

/** عميل واحد مشترك للمتصفح (singleton) — null وقت البناء أو لو المتغيرات ناقصة */
export function createBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;

  browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: AUTH_STORAGE_KEY,
    },
    global: { headers: { "x-client-info": "royal-menu" } },
  });

  return browserClient;
}

export const getSupabase = createBrowserClient;
