import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * عميل Supabase للمتصفح فقط.
 * مفيش أي اتصال بـ Supabase وقت الـ SSR أو وقت البناء — الموقع بيتبني ستاتيك،
 * وكل القراءة/الكتابة بتحصل من متصفح الزبون أو صاحب المطعم.
 *
 * المفاتيح المستخدمة هنا هي المفاتيح العامة بس (NEXT_PUBLIC_):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY   (sb_publishable_… أو anon JWT القديم)
 * ممنوع منعاً باتاً استخدام sb_secret_ / service_role في أي كود بيوصل للمتصفح.
 */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** اسم الجدول اللي فيه صف القائمة */
export const MENU_TABLE = "menu_data";
/** الصف اللي بيشوفه العملاء (منشور) */
export const PUBLISHED_SLUG = "main";
/** صف المسودة — مقروء للمسجّلين دخول بس (is_published = false) */
export const DRAFT_SLUG = "draft";
/** الباكت العام لصور الأصناف واللوجو */
export const MENU_BUCKET = "menu-images";
/** مفتاح تخزين جلسة الدخول في المتصفح */
export const AUTH_STORAGE_KEY = "royal-menu:sb-auth:v1";

/** true لو متغيرات البيئة موجودة — غير كده الموقع بيشتغل localStorage بس */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

let browserClient: SupabaseClient | null = null;

/**
 * بيرجّع عميل واحد مشترك للمتصفح (singleton) — أو null لو:
 *  - إحنا على السيرفر / وقت البناء
 *  - متغيرات البيئة ناقصة (وضع localStorage الكامل)
 */
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
    realtime: { params: { eventsPerSecond: 5 } },
    global: { headers: { "x-client-info": "royal-menu" } },
  });

  return browserClient;
}

/** اختصار مقروء أكتر في باقي الملفات */
export const getSupabase = createBrowserClient;

export interface MenuRow {
  slug: string;
  data: unknown;
  is_published: boolean;
  updated_at: string;
}
