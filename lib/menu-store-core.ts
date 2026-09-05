import { DEFAULT_DATA, STORAGE_KEY } from "./defaults";
import {
  broadcastUpdate,
  clearData,
  loadData,
  normalizeData,
  saveData,
  storageFootprint,
  subscribeToUpdates,
} from "./storage";
import type { Category, MenuData, MenuItem } from "./types";

/**
 * مخزن البيانات بدون React: مصدر حقيقة واحد هو localStorage.
 * القراءة عن طريق useSyncExternalStore في lib/use-menu.tsx
 */
export type SaveState = "idle" | "dirty" | "saved" | "error";

export interface MenuState {
  data: MenuData;
  ready: boolean;
  isCustomized: boolean;
  saveState: SaveState;
  storageKb: number;
}

/** لقطة ثابتة بتستخدم وقت الـ SSR — لازم تفضل نفس الـ reference */
export const MENU_SERVER_STATE: MenuState = {
  data: DEFAULT_DATA,
  ready: false,
  isCustomized: false,
  saveState: "idle",
  storageKb: 0,
};

let state: MenuState = MENU_SERVER_STATE;
const listeners = new Set<() => void>();
let initialized = false;
let persistTimer: number | undefined;
let resetTimer: number | undefined;

const canUseDOM = () => typeof window !== "undefined";

function emit() {
  for (const listener of [...listeners]) listener();
}

function set(patch: Partial<MenuState>) {
  state = { ...state, ...patch };
  emit();
}

function flushPersist() {
  if (!canUseDOM() || persistTimer === undefined) return;
  window.clearTimeout(persistTimer);
  persistTimer = undefined;
  const ok = saveData(state.data);
  if (ok) broadcastUpdate();
}

function ensureInit() {
  if (initialized || !canUseDOM()) return;
  initialized = true;
  // لو التبويب اتقفل أو اتخفى أثناء الكتابة، نفضّي التعديلات المعلقة
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPersist();
  });
  window.addEventListener("pagehide", flushPersist);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  set({
    data: loadData(),
    ready: true,
    isCustomized: raw !== null,
    storageKb: storageFootprint(),
  });
  subscribeToUpdates(() => {
    // تحديث جاي من تبويب تاني
    set({ data: loadData(), isCustomized: true, storageKb: storageFootprint() });
  });
}

export function subscribeMenu(listener: () => void): () => void {
  listeners.add(listener);
  ensureInit();
  return () => {
    listeners.delete(listener);
  };
}

export function getMenuSnapshot(): MenuState {
  return state;
}

const clone = (value: MenuData): MenuData =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as MenuData);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function commit(next: MenuData) {
  const stamped: MenuData = { ...next, updatedAt: new Date().toISOString() };
  set({ data: stamped, saveState: "dirty" });
  schedulePersist(stamped);
}

/** الكتابة على القرص بتتأجل شوية عشان الطباعة على الكيبورد تفضل خفيفة */
function schedulePersist(value: MenuData) {
  if (!canUseDOM()) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    const ok = saveData(value);
    set({
      saveState: ok ? "saved" : "error",
      storageKb: storageFootprint(),
      ...(ok ? { isCustomized: true } : {}),
    });
    if (ok) broadcastUpdate();
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      if (state.saveState === "saved") set({ saveState: "idle" });
    }, 1500);
  }, 160);
}

/* ------------------------------------------------------------- mutations */

export function updateMenu(recipe: (draft: MenuData) => void) {
  const draft = clone(state.data);
  recipe(draft);
  commit(draft);
}

const patchSection =
  <K extends "brand" | "contact" | "commerce" | "admin">(key: K) =>
  (patch: Partial<MenuData[K]>) =>
    updateMenu((draft) => {
      Object.assign(draft[key], patch);
    });

export const patchBrand = patchSection("brand");
export const patchContact = patchSection("contact");
export const patchCommerce = patchSection("commerce");
export const patchAdmin = patchSection("admin");

export function addCategory(input: Omit<Category, "id">) {
  updateMenu((draft) => {
    draft.categories.push({ ...input, id: `c_${newId()}` });
  });
}

export function updateCategory(id: string, patch: Partial<Category>) {
  updateMenu((draft) => {
    const category = draft.categories.find((item) => item.id === id);
    if (category) Object.assign(category, patch);
  });
}

export function deleteCategory(id: string) {
  updateMenu((draft) => {
    // مينفعش نفضّي القائمة بحذف آخر قسم
    if (draft.categories.length <= 1) return;
    const index = draft.categories.findIndex((item) => item.id === id);
    if (index === -1) return;
    draft.categories.splice(index, 1);
    const fallback = draft.categories[0].id;
    // أصناف القسم المحذوف تنقل على أول قسم متاح بدل ما تضيع
    draft.items.forEach((item) => {
      if (item.categoryId === id) item.categoryId = fallback;
    });
  });
}

export function moveCategory(id: string, dir: -1 | 1) {
  updateMenu((draft) => {
    const i = draft.categories.findIndex((item) => item.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= draft.categories.length) return;
    [draft.categories[i], draft.categories[j]] = [draft.categories[j], draft.categories[i]];
  });
}

export function addItem(input: Omit<MenuItem, "id">) {
  const id = `i_${newId()}`;
  updateMenu((draft) => {
    const maxOrder = Math.max(
      0,
      ...draft.items.filter((item) => item.categoryId === input.categoryId).map((item) => item.order),
    );
    draft.items.push({ ...input, id, order: maxOrder + 1 });
  });
  return id;
}

export function updateItem(id: string, patch: Partial<MenuItem>) {
  updateMenu((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id);
    if (item) Object.assign(item, patch);
  });
}

export function deleteItem(id: string) {
  updateMenu((draft) => {
    draft.items = draft.items.filter((item) => item.id !== id);
  });
}

export function duplicateItem(id: string) {
  updateMenu((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id);
    if (!item) return;
    draft.items.push({
      ...item,
      id: `i_${newId()}`,
      name: `${item.name} (نسخة)`,
      order: item.order + 0.5,
    });
    const siblings = draft.items
      .filter((candidate) => candidate.categoryId === item.categoryId)
      .sort((a, b) => a.order - b.order);
    siblings.forEach((candidate, index) => {
      const target = draft.items.find((row) => row.id === candidate.id);
      if (target) target.order = index + 1;
    });
  });
}

export function moveItem(id: string, dir: -1 | 1) {
  updateMenu((draft) => {
    const current = draft.items.find((item) => item.id === id);
    if (!current) return;
    // إعادة الترتيب جوه القسم نفسه
    const siblings = draft.items
      .filter((item) => item.categoryId === current.categoryId)
      .sort((a, b) => a.order - b.order);
    const i = siblings.findIndex((item) => item.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
    siblings.forEach((item, index) => {
      const target = draft.items.find((row) => row.id === item.id);
      if (target) target.order = index + 1;
    });
  });
}

export function setCategoryAvailability(categoryId: string, available: boolean) {
  updateMenu((draft) => {
    draft.items.forEach((item) => {
      if (item.categoryId === categoryId) item.available = available;
    });
  });
}

export function exportJson(): string {
  return JSON.stringify(state.data, null, 2);
}

export function importJson(text: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(text) as Partial<MenuData>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
      return { ok: false, error: "الملف لازم يكون JSON فيه مصفوفة items" };
    }
    commit(normalizeData({ ...DEFAULT_DATA, ...parsed }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ملف غير صالح" };
  }
}

export function resetToDefaults() {
  clearData();
  set({ data: DEFAULT_DATA, isCustomized: false, storageKb: 0, saveState: "idle" });
  broadcastUpdate();
}
