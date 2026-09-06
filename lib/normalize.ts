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

/** تطبيع أي قائمة قادمة من الباك إند قبل ما تُعرض أو تُحفظ */
export function normalizeData(raw: unknown): MenuData {
  const merged = mergeWithDefaults<MenuData>(DEFAULT_DATA, raw);
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
