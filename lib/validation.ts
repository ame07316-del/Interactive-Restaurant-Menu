/**
 * دوال تحقق مشتركة للأمان - للـ demo/portfolio
 */

export function isSafeHttpUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  // السماح بالروابط النسبية للصور المحلية
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  // السماح بـ data:image للصور المرفوعة
  if (trimmed.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  if (!url) return "";
  return isSafeHttpUrl(url) ? url.trim() : "";
}

export function sanitizeText(input: string, maxLen = 500): string {
  if (!input || typeof input !== "string") return "";
  // إزالة control characters وحروف غير مرئية
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function isValidOrderType(value: string): boolean {
  return ["delivery", "takeaway", "dinein"].includes(value);
}

export function clampQuantity(q: unknown, max = 50): number {
  const n = Math.floor(Number(q) || 0);
  return Math.max(1, Math.min(max, n));
}

// تحقق من ملف JSON المستورد للأدمن
export function validateImportedMenu(data: unknown): { ok: true } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "الملف ليس JSON صحيح" };
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.items)) return { ok: false, error: "الملف لازم يحتوي على items" };
  if (!Array.isArray(d.categories)) return { ok: false, error: "الملف لازم يحتوي على categories" };
  if (d.items.length > 200) return { ok: false, error: "عدد الأصناف كبير جداً (الحد 200)" };
  for (const item of d.items as Array<Record<string, unknown>>) {
    if (typeof item.name !== "string" || !item.name.trim()) return { ok: false, error: "كل صنف لازم له اسم" };
    if (typeof item.price !== "number" || item.price < 0 || item.price > 100000)
      return { ok: false, error: `سعر غير صالح للصنف: ${item.name}` };
    if (item.image && typeof item.image === "string" && item.image.length > 500_000)
      return { ok: false, error: `صورة كبيرة جداً للصنف: ${item.name}` };
    if (item.image && typeof item.image === "string" && item.image.trim() && !isSafeHttpUrl(item.image))
      return { ok: false, error: `رابط صورة غير آمن للصنف: ${item.name}` };
  }
  const jsonSize = JSON.stringify(data).length;
  if (jsonSize > 4_000_000) return { ok: false, error: "حجم الملف كبير جداً (الحد 4MB)" };
  return { ok: true };
}
