import { DEFAULT_DATA } from "./defaults";
import type { MenuData } from "./types";

export const DATA_VERSION = 1;

/** حد التنبيه الافتراضي لنقص المخزون (عدد القطع المتبقية) */
export const DEFAULT_LOW_STOCK_THRESHOLD = 2;

type Plain = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Plain =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * دمج البيانات القادمة من قاعدة البيانات مع بيانات البداية:
 * أي حقل جديد بيتضاف في الكود بيتعوّض تلقائياً، والمصفوفات (الأصناف والأقسام)
 * بتاخد قيمتها المخزّنة كما هي عشان الحذف والتعديل يفضلوا محفوظين.
 */
function mergeWithDefaults<T>(base: T, saved: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(saved)) {
    return (saved === undefined ? base : (saved as T)) as T;
  }
  const out: Plain = { ...base };
  for (const [key, baseValue] of Object.entries(base)) {
    if (!(key in saved)) continue;
    const savedValue = saved[key];
    if (isPlainObject(baseValue) && isPlainObject(savedValue)) {
      out[key] = mergeWithDefaults(baseValue, savedValue);
    } else if (savedValue !== undefined && savedValue !== null) {
      out[key] = savedValue;
    } else if (baseValue !== undefined && baseValue !== null && savedValue === null) {
      // null صريح (مثل oldPrice: null) بيتحفظ كما هو
      out[key] = savedValue;
    }
  }
  return out as T;
}

/** خريطة الصور الجديدة المحلية — لضمان تحديث أي بيانات قديمة محفوظة (Supabase / ملف محلي) */
const LOCAL_IMAGE_MAP: Record<string, string> = {
  i1: "/images/menu/i1.jpg",
  i2: "/images/menu/i2.jpg",
  i3: "/images/menu/i3.jpg",
  i4: "/images/menu/i4.jpg",
  i5: "/images/menu/i5.jpg",
  i6: "/images/menu/i6.jpg",
  i7: "/images/menu/i7.jpg",
  i8: "/images/menu/i8.jpg",
  i9: "/images/menu/i9.jpg",
  i10: "/images/menu/i10.jpg",
  i11: "/images/menu/i11.jpg",
  i12: "/images/menu/i12.jpg",
  i13: "/images/menu/i13.jpg",
  i14: "/images/menu/i14.jpg",
};

/** تطبيع أي قائمة قادمة من الباك إند قبل ما تُعرض أو تُحفظ */
export function normalizeData(raw: unknown): MenuData {
  const merged = mergeWithDefaults<MenuData>(DEFAULT_DATA, raw);
  // ترقية الصور القديمة (unsplash) للصور الجديدة المحلية — بدون ما نغير أي شيء تاني
  if (merged.brand.heroImage?.includes("unsplash.com")) {
    merged.brand.heroImage = "/images/menu/hero.jpg";
  }
  for (const item of merged.items) {
    if (item.image?.includes("unsplash.com") && LOCAL_IMAGE_MAP[item.id]) {
      item.image = LOCAL_IMAGE_MAP[item.id];
    }
  }
  const knownCats = new Set(merged.categories.map((c) => c.id));
  return {
    ...merged,
    items: merged.items
      .map((item) => ({
        ...item,
        // كل صنف عنده كمية ومخزون وحد تنبيه قابل للتعديل من اللوحة
        trackStock: item.trackStock ?? true,
        stock: Math.max(0, Math.floor(item.stock ?? (item.available ? 25 : 0))),
        lowStockThreshold: Math.max(0, Math.floor(item.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)),
        // الأمان: أي صنف قسمه اتحذف ينزل في أول قسم بدل ما يختفي
        categoryId: knownCats.has(item.categoryId)
          ? item.categoryId
          : (merged.categories[0]?.id ?? ""),
      }))
      .sort((a, b) => a.order - b.order),
  };
}
