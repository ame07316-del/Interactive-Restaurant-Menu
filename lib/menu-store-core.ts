import { DEFAULT_DATA, STORAGE_KEY } from "./defaults";
import {
  clearData,
  loadData,
  normalizeData,
  saveData,
  storageFootprint,
  subscribeToUpdates,
} from "./storage";
import { DRAFT_SLUG, PUBLISHED_SLUG, isSupabaseConfigured } from "./supabase";
import { canWriteToCloud, getAuthSnapshot, subscribeAuth } from "./supabase-auth-core";
import {
  fetchMenuRow,
  publishMenu,
  saveDraftMenu,
  subscribeMenuChanges,
  type RemoteSnapshot,
} from "./supabase-menu";
import type { Category, MenuData, MenuItem } from "./types";

/**
 * مخزن البيانات بدون React.
 *
 * مصدر الحقيقة:
 *   - Supabase (جدول public.menu_data) لو متغيرات البيئة موجودة → النشر بيوصل لكل العملاء لحظياً.
 *   - localStorage دايماً كـ cache + fallback (الموقع بيشتغل ١٠٠٪ من غير Supabase).
 *
 * الصفوف:
 *   slug='main'  → النسخة المنشورة اللي بيشوفها العملاء (is_published = true)
 *   slug='draft' → المسودة، مقروءة للمسجّلين دخول بس (is_published = false)
 *
 * القراءة من React عن طريق useSyncExternalStore في lib/use-menu.tsx
 */
export type SaveState = "idle" | "dirty" | "saved" | "error";

/** حالة المزامنة مع السحابة */
export type CloudStatus =
  | "off" // مفيش Supabase — localStorage بس
  | "connecting" // بنجيب البيانات
  | "live" // متزامن
  | "syncing" // بيرفع مسودة
  | "publishing" // بينشر
  | "error"; // فشل — فيه زر إعادة محاولة

export interface CloudState {
  enabled: boolean;
  authed: boolean;
  email: string | null;
  status: CloudStatus;
  error: string | null;
  /** آخر تحديث للنسخة المنشورة */
  publishedAt: string | null;
  /** آخر تحديث للمسودة */
  draftAt: string | null;
  /** فيه تعديلات في المسودة لسه متنشرتش */
  hasUnpublished: boolean;
}

export interface MenuState {
  data: MenuData;
  ready: boolean;
  isCustomized: boolean;
  saveState: SaveState;
  storageKb: number;
  cloud: CloudState;
}

const OFFLINE_CLOUD: CloudState = {
  enabled: false,
  authed: false,
  email: null,
  status: "off",
  error: null,
  publishedAt: null,
  draftAt: null,
  hasUnpublished: false,
};

/** لقطة ثابتة بتستخدم وقت الـ SSR — لازم تفضل نفس الـ reference */
export const MENU_SERVER_STATE: MenuState = {
  data: DEFAULT_DATA,
  ready: false,
  isCustomized: false,
  saveState: "idle",
  storageKb: 0,
  cloud: OFFLINE_CLOUD,
};

let state: MenuState = MENU_SERVER_STATE;
const listeners = new Set<() => void>();
let initialized = false;
let persistTimer: number | undefined;
let resetTimer: number | undefined;
let cloudTimer: number | undefined;
let pendingCloudPush = false;
let lastKnownUserId: string | null = null;
let seeded = false;
/** آخر عملية سحابية فشلت — عشان زر «إعادة المحاولة» */
let lastFailedAction: "draft" | "publish" | "pull" | null = null;
let lastPullAt = 0;

const canUseDOM = () => typeof window !== "undefined";

function emit() {
  for (const listener of [...listeners]) listener();
}

function set(patch: Partial<MenuState>) {
  state = { ...state, ...patch };
  emit();
}

function setCloud(patch: Partial<CloudState>) {
  state = { ...state, cloud: { ...state.cloud, ...patch } };
  emit();
}

function flushPersist() {
  if (!canUseDOM() || persistTimer === undefined) return;
  window.clearTimeout(persistTimer);
  persistTimer = undefined;
  saveData(state.data);
}

/* ------------------------------------------------------------ init */

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
    cloud: { ...OFFLINE_CLOUD, enabled: isSupabaseConfigured() },
  });

  // تحديث جاي من تبويب تاني في نفس المتصفح (حدث storage)
  subscribeToUpdates(() => {
    set({ data: loadData(), isCustomized: true, storageKb: storageFootprint() });
  });

  if (!isSupabaseConfigured()) return;

  setCloud({ status: "connecting" });

  // أي تغيّر في حالة الدخول → نعيد المزامنة (المسودة بتبان للأدمن بس)
  subscribeAuth(() => {
    const auth = getAuthSnapshot();
    if (!auth.checked) return;
    const changed = auth.userId !== lastKnownUserId;
    lastKnownUserId = auth.userId;
    setCloud({ authed: Boolean(auth.userId), email: auth.email });
    if (changed) {
      seeded = false;
      void pullRemote();
    }
  });

  // realtime: أي نشر من الأدمن يوصل لكل المتصفحات المفتوحة
  subscribeMenuChanges((slug) => {
    if (slug !== PUBLISHED_SLUG && slug !== DRAFT_SLUG) return;
    // لو إحنا نفسنا بنكتب دلوقتي بنستنى لما الكتابة تخلص
    if (pendingCloudPush || state.saveState === "dirty") return;
    void pullRemote();
  });

  void pullRemote();

  // رجوع النت / فتح التبويب تاني → مزامنة جديدة
  window.addEventListener("online", () => void pullRemote());
  document.addEventListener("visibilitychange", () => {
    // رجوع للتبويب → مزامنة (مرة كل ١٥ ثانية بحد أقصى)
    if (document.visibilityState !== "visible" || pendingCloudPush) return;
    if (Date.now() - lastPullAt < 15_000) return;
    void pullRemote();
  });
}

/* ------------------------------------------------------- cloud read */

function applySnapshot(snapshot: RemoteSnapshot) {
  // نفس البيانات؟ منعملش re-render ولا نكتب على القرص
  if (JSON.stringify(snapshot.data) === JSON.stringify(state.data)) return;
  const ok = saveData(snapshot.data);
  set({
    data: snapshot.data,
    isCustomized: true,
    storageKb: storageFootprint(),
    saveState: ok ? state.saveState : "error",
  });
}

/** قراءة الصفوف من Supabase وتحديث الكاش المحلي */
async function pullRemote(): Promise<void> {
  if (!isSupabaseConfigured() || !canUseDOM()) return;
  const authed = canWriteToCloud();
  lastPullAt = Date.now();
  // «جاري الاتصال…» بتبان بس لو لسه مفيش مزامنة ناجحة — عشان الشارة متطقطقش كل مرة
  if (state.cloud.status === "off" || state.cloud.status === "error") {
    setCloud({ status: "connecting" });
  }

  const [published, draft] = await Promise.all([
    fetchMenuRow(PUBLISHED_SLUG),
    authed ? fetchMenuRow(DRAFT_SLUG) : Promise.resolve({ ok: true, value: null } as const),
  ]);

  if (!published.ok) {
    lastFailedAction = "pull";
    // بنفضل شغالين بالكاش المحلي — من غير أي error في الكونسول
    setCloud({ status: "error", error: published.error ?? "تعذّرت القراءة من السحابة" });
    return;
  }

  let publishedRow = published.value ?? null;

  // أول مرة: الصف فاضي ({"version":1}) → نملاه من البيانات الافتراضية
  if (authed && !seeded && (!publishedRow || !publishedRow.complete)) {
    seeded = true;
    const seed = state.isCustomized ? state.data : DEFAULT_DATA;
    const result = await publishMenu(seed);
    if (result.ok) {
      publishedRow = {
        slug: PUBLISHED_SLUG,
        data: seed,
        isPublished: true,
        updatedAt: result.value ?? new Date().toISOString(),
        complete: true,
      };
    } else {
      lastFailedAction = "publish";
      setCloud({ status: "error", error: result.error ?? "تعذّر تجهيز البيانات الأولية" });
      return;
    }
  }

  const draftRow = draft.ok ? (draft.value ?? null) : null;
  const draftIsNewer =
    Boolean(draftRow?.complete) &&
    (!publishedRow || (draftRow as RemoteSnapshot).updatedAt > publishedRow.updatedAt);

  // الأدمن بيشوف المسودة لو هي الأحدث، والعميل بيشوف المنشور دايماً
  const chosen = authed && draftIsNewer ? draftRow : publishedRow;

  if (chosen?.complete && !pendingCloudPush && state.saveState !== "dirty") {
    applySnapshot(chosen);
  }

  lastFailedAction = null;
  setCloud({
    status: "live",
    error: null,
    publishedAt: publishedRow?.updatedAt ?? null,
    draftAt: draftRow?.updatedAt ?? null,
    hasUnpublished: draftIsNewer,
  });
}

/* ------------------------------------------------------ cloud write */

/** رفع المسودة (تلقائي بعد أي تعديل، أو يدوي من زر «حفظ كمسودة») */
async function pushDraft(): Promise<boolean> {
  if (!canWriteToCloud()) return false;
  pendingCloudPush = true;
  setCloud({ status: "syncing", error: null });
  const snapshot = state.data;
  const result = await saveDraftMenu(snapshot);
  pendingCloudPush = false;
  if (!result.ok) {
    lastFailedAction = "draft";
    setCloud({ status: "error", error: result.error ?? "فشل رفع المسودة" });
    return false;
  }
  lastFailedAction = null;
  setCloud({
    status: "live",
    error: null,
    draftAt: result.value ?? new Date().toISOString(),
    hasUnpublished: true,
  });
  return true;
}

function scheduleCloudPush() {
  if (!canUseDOM() || !canWriteToCloud()) return;
  window.clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => void pushDraft(), 900);
}

/** حفظ كمسودة فوراً — العميل بيفضل شايف آخر نسخة منشورة */
export async function saveDraftNow(): Promise<boolean> {
  if (canUseDOM()) window.clearTimeout(cloudTimer);
  flushPersist();
  if (!canWriteToCloud()) return false;
  return pushDraft();
}

/** حفظ ونشر — بيتحدّث صف main فوراً وكل العملاء بيشوفوه في نفس الثانية */
export async function publishNow(): Promise<boolean> {
  if (canUseDOM()) window.clearTimeout(cloudTimer);
  flushPersist();
  if (!canWriteToCloud()) return false;

  pendingCloudPush = true;
  setCloud({ status: "publishing", error: null });
  const snapshot = state.data;
  const result = await publishMenu(snapshot);
  if (!result.ok) {
    pendingCloudPush = false;
    lastFailedAction = "publish";
    setCloud({ status: "error", error: result.error ?? "فشل النشر" });
    return false;
  }
  // نخلي المسودة مطابقة للمنشور عشان متفضلش "أحدث" بالغلط
  const draftResult = await saveDraftMenu(snapshot);
  pendingCloudPush = false;
  lastFailedAction = null;
  setCloud({
    status: "live",
    error: null,
    publishedAt: result.value ?? new Date().toISOString(),
    draftAt: draftResult.value ?? result.value ?? new Date().toISOString(),
    hasUnpublished: false,
  });
  return true;
}

/** إعادة محاولة آخر عملية فشلت */
export async function retryCloud(): Promise<boolean> {
  switch (lastFailedAction) {
    case "publish":
      return publishNow();
    case "draft":
      return saveDraftNow();
    default:
      await pullRemote();
      return state.cloud.status === "live";
  }
}

/** إعادة تحميل يدوي من السحابة */
export async function refreshFromCloud(): Promise<void> {
  await pullRemote();
}

/* --------------------------------------------------- store plumbing */

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
  scheduleCloudPush();
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
  // الرجوع للافتراضي محلي — عشان يبقى منشور لازم تضغط «حفظ ونشر»
  scheduleCloudPush();
}
