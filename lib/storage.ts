import { CART_KEY, DEFAULT_DATA, STORAGE_KEY } from "./defaults";
import type { CartLine, MenuData } from "./types";

export const DATA_VERSION = 1;

type Plain = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Plain =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * دمج البيانات المحفوظة مع الافتراضي: أي حقل جديد في الكود بيتم تعويضه تلقائياً،
 * والمصفوفات (الأصناف والأقسام) بتاخد قيمة المتصفح كما هي عشان الحذف يفضل محفوظ.
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

export function normalizeData(raw: unknown): MenuData {
  const merged = mergeWithDefaults<MenuData>(DEFAULT_DATA, raw);
  const knownCats = new Set(merged.categories.map((c) => c.id));
  return {
    ...merged,
    items: merged.items
      .map((item) => ({
        ...item,
        // الأمان: أي صنف قسمه اتحذف ينزل في قسم "غير مصنّف" بدل ما يختفي
        categoryId: knownCats.has(item.categoryId)
          ? item.categoryId
          : (merged.categories[0]?.id ?? ""),
      }))
      .sort((a, b) => a.order - b.order),
  };
}

export function loadData(): MenuData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return normalizeData(JSON.parse(raw));
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: MenuData): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(CART_KEY);
}

export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* تجاهل */
  }
}

/** حجم التخزين المستخدم بالكيلوبايت (تقريبي) */
export function storageFootprint(): number {
  if (typeof window === "undefined") return 0;
  let bytes = 0;
  for (const key of [STORAGE_KEY, CART_KEY]) {
    bytes += (window.localStorage.getItem(key) ?? "").length * 2;
  }
  return Math.round(bytes / 1024);
}

/**
 * التبويبات التانية في نفس المتصفح بتتحدّث عن طريق حدث storage المدمج
 * (BroadcastChannel كان زيادة عن اللزوم بعد ما بقى في Supabase Realtime للأجهزة التانية).
 */
export function subscribeToUpdates(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
