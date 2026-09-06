import { DEFAULT_DATA } from "./defaults";
import { normalizeData } from "./normalize";
import { authenticatedFetch } from "./supabase-auth-core";
import type { Category, MenuData, MenuItem } from "./types";

export type SaveState = "idle" | "dirty" | "saved" | "error";

export interface MenuState {
  data: MenuData;
  ready: boolean;
  isCustomized: boolean;
  saveState: SaveState;
  /** رسالة الخطأ القادمة من الباك إند عند فشل الحفظ */
  saveError: string | null;
  storageKb: number;
}

export const MENU_SERVER_STATE: MenuState = {
  data: DEFAULT_DATA,
  ready: false,
  isCustomized: false,
  saveState: "idle",
  saveError: null,
  storageKb: 0,
};

let state = MENU_SERVER_STATE;
const listeners = new Set<() => void>();
let initialized = false;
let persistTimer: number | undefined;
let resetTimer: number | undefined;

function emit() {
  for (const listener of [...listeners]) listener();
}
function set(patch: Partial<MenuState>) {
  state = { ...state, ...patch };
  emit();
}
const sizeOf = (data: MenuData) => Math.round(new Blob([JSON.stringify(data)]).size / 1024);
const clone = (value: MenuData): MenuData => structuredClone(value);
const newId = () => crypto.randomUUID().slice(0, 8);

async function errorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload?.error ?? null;
  } catch {
    return null;
  }
}

/** قراءة القائمة من الباك إند */
export async function refreshMenu() {
  try {
    const response = await authenticatedFetch("/api/menu", { cache: "no-store" });
    if (!response.ok) throw new Error((await errorMessage(response)) ?? "تعذّر قراءة القائمة من الباك إند");
    const data = normalizeData(await response.json());
    set({ data, ready: true, isCustomized: true, storageKb: sizeOf(data), saveState: "idle", saveError: null });
  } catch (error) {
    set({
      data: DEFAULT_DATA,
      ready: true,
      saveState: "error",
      saveError: error instanceof Error && error.message ? error.message : "تعذّر الاتصال بالباك إند",
    });
  }
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void refreshMenu();
  window.addEventListener("focus", () => void refreshMenu());
}

export function subscribeMenu(listener: () => void) {
  listeners.add(listener);
  ensureInit();
  return () => listeners.delete(listener);
}
export function getMenuSnapshot() {
  return state;
}

/** حفظ التعديل في الباك إند (PUT /api/menu بتوكن الأدمن) */
function schedulePersist(value: MenuData) {
  if (typeof window === "undefined") return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(async () => {
    try {
      const response = await authenticatedFetch("/api/menu", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      });
      if (!response.ok) throw new Error((await errorMessage(response)) ?? "تعذّر حفظ التعديلات");
      const data = normalizeData(await response.json());
      set({ data, saveState: "saved", saveError: null, isCustomized: true, storageKb: sizeOf(data) });
    } catch (error) {
      set({
        saveState: "error",
        saveError: error instanceof Error && error.message ? error.message : "تعذّر حفظ التعديلات",
      });
    }
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      if (state.saveState === "saved") set({ saveState: "idle" });
    }, 1500);
  }, 220);
}

function commit(next: MenuData) {
  const stamped = { ...next, updatedAt: new Date().toISOString() };
  set({ data: stamped, saveState: "dirty" });
  schedulePersist(stamped);
}

export function updateMenu(recipe: (draft: MenuData) => void) {
  const draft = clone(state.data);
  recipe(draft);
  commit(draft);
}

const patchSection =
  <K extends "brand" | "contact" | "commerce">(key: K) =>
  (patch: Partial<MenuData[K]>) =>
    updateMenu((draft) => {
      Object.assign(draft[key], patch);
    });

export const patchBrand = patchSection("brand");
export const patchContact = patchSection("contact");
export const patchCommerce = patchSection("commerce");

export function addCategory(input: Omit<Category, "id">) {
  updateMenu((d) => d.categories.push({ ...input, id: `c_${newId()}` }));
}
export function updateCategory(id: string, patch: Partial<Category>) {
  updateMenu((d) => {
    const row = d.categories.find((x) => x.id === id);
    if (row) Object.assign(row, patch);
  });
}
export function deleteCategory(id: string) {
  updateMenu((d) => {
    if (d.categories.length <= 1) return;
    const i = d.categories.findIndex((x) => x.id === id);
    if (i < 0) return;
    d.categories.splice(i, 1);
    d.items.forEach((x) => {
      if (x.categoryId === id) x.categoryId = d.categories[0].id;
    });
  });
}
export function moveCategory(id: string, dir: -1 | 1) {
  updateMenu((d) => {
    const i = d.categories.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i >= 0 && j >= 0 && j < d.categories.length) [d.categories[i], d.categories[j]] = [d.categories[j], d.categories[i]];
  });
}
export function addItem(input: Omit<MenuItem, "id">) {
  const id = `i_${newId()}`;
  updateMenu((d) => {
    const max = Math.max(0, ...d.items.filter((x) => x.categoryId === input.categoryId).map((x) => x.order));
    d.items.push({ ...input, id, order: max + 1 });
  });
  return id;
}
export function updateItem(id: string, patch: Partial<MenuItem>) {
  updateMenu((d) => {
    const row = d.items.find((x) => x.id === id);
    if (row) Object.assign(row, patch);
  });
}
export function deleteItem(id: string) {
  updateMenu((d) => {
    d.items = d.items.filter((x) => x.id !== id);
  });
}
export function duplicateItem(id: string) {
  updateMenu((d) => {
    const row = d.items.find((x) => x.id === id);
    if (!row) return;
    d.items.push({ ...row, id: `i_${newId()}`, name: `${row.name} (نسخة)`, order: row.order + 0.5 });
  });
}
export function moveItem(id: string, dir: -1 | 1) {
  updateMenu((d) => {
    const current = d.items.find((x) => x.id === id);
    if (!current) return;
    const rows = d.items.filter((x) => x.categoryId === current.categoryId).sort((a, b) => a.order - b.order);
    const i = rows.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    rows.forEach((x, n) => (x.order = n + 1));
  });
}
export function setCategoryAvailability(categoryId: string, available: boolean) {
  updateMenu((d) =>
    d.items.forEach((x) => {
      if (x.categoryId === categoryId) x.available = available;
    }),
  );
}

/** نسخة احتياطية من البيانات المحفوظة في الباك إند */
export function exportJson() {
  return JSON.stringify(state.data, null, 2);
}

/** استيراد نسخة احتياطية — بتتحفظ في الباك إند فوراً */
export function importJson(text: string) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.items)) return { ok: false, error: "الملف لازم يكون JSON فيه مصفوفة items" };
    commit(normalizeData({ ...DEFAULT_DATA, ...parsed }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ملف غير صالح" };
  }
}

export function resetToDefaults() {
  commit(clone(DEFAULT_DATA));
}
