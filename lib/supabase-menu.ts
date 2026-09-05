import { normalizeData } from "./storage";
import {
  DRAFT_SLUG,
  MENU_BUCKET,
  MENU_TABLE,
  PUBLISHED_SLUG,
  createBrowserClient,
  type MenuRow,
} from "./supabase";
import type { MenuData } from "./types";

/**
 * كل التعامل مع جدول public.menu_data وباكت الصور.
 * الطبقة دي مبتترميش أبداً — بترجّع { ok, error } عشان الواجهة تفضل شغالة
 * حتى لو النت مقطوع أو Supabase مش متظبط.
 */

export interface RemoteSnapshot {
  slug: string;
  data: MenuData;
  isPublished: boolean;
  updatedAt: string;
  /** الصف فيه قائمة كاملة (مش {"version":1} فاضية) */
  complete: boolean;
}

export interface RemoteResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

/** الصف الفاضي اللي بيتعمل مع إنشاء الجدول: {"version":1} */
export function isCompleteMenu(value: unknown): value is MenuData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MenuData>;
  return Array.isArray(candidate.items) && Array.isArray(candidate.categories) && candidate.items.length >= 0;
}

/** مهلة قصوى لأي طلب — عشان المؤشر ميفضلش «جاري الاتصال…» للأبد لو النت واقف */
const REQUEST_TIMEOUT_MS = 12_000;

function timeoutSignal(): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") return undefined;
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function describe(error: unknown): string {
  if (!error) return "خطأ غير معروف";
  if (typeof error === "string") return error;
  const raw = error as { message?: string; details?: string; name?: string };
  const message = raw.message ?? raw.details ?? raw.name ?? "";
  const text = message.toLowerCase();
  if (text.includes("abort") || text.includes("timeout") || text.includes("timed out")) {
    return "الاتصال أخد وقت طويل — جرّب تاني";
  }
  if (text.includes("fetch") || text.includes("network")) return "مفيش اتصال بالسيرفر";
  if (text.includes("row-level security") || text.includes("permission")) {
    return "الصلاحيات مرفوضة — لازم تسجّل دخول كأدمن";
  }
  if (text.includes("jwt") || text.includes("expired")) return "الجلسة انتهت — سجّل دخول تاني";
  return message || "خطأ غير معروف";
}

/** قراءة صف واحد بالـ slug — null معناها الصف مش موجود أو مش مسموح بقراءته */
export async function fetchMenuRow(slug: string): Promise<RemoteResult<RemoteSnapshot | null>> {
  const client = createBrowserClient();
  if (!client) return { ok: false, error: "Supabase مش متاح" };
  try {
    let query = client
      .from(MENU_TABLE)
      .select("slug,data,is_published,updated_at")
      .eq("slug", slug);
    const signal = timeoutSignal();
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle<MenuRow>();

    if (error) return { ok: false, error: describe(error) };
    if (!data) return { ok: true, value: null };

    const complete = isCompleteMenu(data.data);
    return {
      ok: true,
      value: {
        slug: data.slug,
        data: complete ? normalizeData(data.data) : normalizeData({}),
        isPublished: Boolean(data.is_published),
        updatedAt: data.updated_at ?? new Date().toISOString(),
        complete,
      },
    };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export const fetchPublishedMenu = () => fetchMenuRow(PUBLISHED_SLUG);
export const fetchDraftMenu = () => fetchMenuRow(DRAFT_SLUG);

/**
 * كتابة (upsert) صف القائمة — محتاجة مستخدم مسجّل دخول (RLS).
 * بنجرّب UPDATE الأول وبعدين INSERT لو الصف مش موجود، بدل upsert واحدة،
 * عشان الكتابة تنجح حتى لو سياسات الـ RLS عندك مقسّمة (update بس على الصفوف الموجودة).
 */
export async function upsertMenuRow(
  slug: string,
  data: MenuData,
  isPublished: boolean,
): Promise<RemoteResult<string>> {
  const client = createBrowserClient();
  if (!client) return { ok: false, error: "Supabase مش متاح" };
  try {
    let updateQuery = client
      .from(MENU_TABLE)
      .update({ data, is_published: isPublished })
      .eq("slug", slug)
      .select("updated_at");
    const updateSignal = timeoutSignal();
    if (updateSignal) updateQuery = updateQuery.abortSignal(updateSignal);
    const { data: updated, error: updateError } = await updateQuery.maybeSingle<{ updated_at: string }>();

    if (updateError) return { ok: false, error: describe(updateError) };
    if (updated) return { ok: true, value: updated.updated_at ?? new Date().toISOString() };

    // الصف لسه مش موجود (مثلاً أول مسودة) → إدراج
    let insertQuery = client
      .from(MENU_TABLE)
      .insert({ slug, data, is_published: isPublished })
      .select("updated_at");
    const insertSignal = timeoutSignal();
    if (insertSignal) insertQuery = insertQuery.abortSignal(insertSignal);
    const { data: inserted, error: insertError } = await insertQuery.maybeSingle<{ updated_at: string }>();

    if (insertError) return { ok: false, error: describe(insertError) };
    return { ok: true, value: inserted?.updated_at ?? new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export const publishMenu = (data: MenuData) => upsertMenuRow(PUBLISHED_SLUG, data, true);
export const saveDraftMenu = (data: MenuData) => upsertMenuRow(DRAFT_SLUG, data, false);

/**
 * الاشتراك في postgres_changes على public.menu_data.
 * أي INSERT/UPDATE بيوصل لكل المتصفحات المفتوحة في نفس اللحظة.
 * ملاحظة: Realtime بيحترم الـ RLS — الزائر (anon) مش هيستقبل تغييرات المسودة.
 */
export function subscribeMenuChanges(onChange: (slug: string) => void): () => void {
  const client = createBrowserClient();
  if (!client) return () => {};

  const channel = client
    .channel("menu_data:sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: MENU_TABLE },
      (payload) => {
        const row = (payload.new ?? payload.old) as Partial<MenuRow> | null;
        onChange(row?.slug ?? PUBLISHED_SLUG);
      },
    )
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      /* تجاهل */
    }
  };
}

/** رفع صورة للباكت العام ورجوع الـ public URL */
export async function uploadMenuImage(
  blob: Blob,
  extension = "webp",
): Promise<RemoteResult<string>> {
  const client = createBrowserClient();
  if (!client) return { ok: false, error: "Supabase مش متاح" };
  const stamp = Date.now().toString(36);
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const path = `menu/${stamp}-${random}.${extension}`;

  try {
    const { error } = await client.storage.from(MENU_BUCKET).upload(path, blob, {
      cacheControl: "31536000",
      contentType: blob.type || `image/${extension}`,
      upsert: false,
    });
    if (error) return { ok: false, error: describe(error) };

    const { data } = client.storage.from(MENU_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) return { ok: false, error: "الرفع تم لكن الرابط العام مش متاح" };
    return { ok: true, value: data.publicUrl };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}
