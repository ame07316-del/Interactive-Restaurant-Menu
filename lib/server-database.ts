import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_DATA } from "./defaults";
import { normalizeData } from "./normalize";
import {
  fetchAdminOverview,
  fetchPublishedMenu,
  isSupabaseStoreConfigured,
  markAllNotificationsRead,
  placeOrder,
  probeSupabaseStore,
  savePublishedMenu,
  type PlaceOrderInput,
} from "./supabase-store";import type { AdminOverview, MenuData, SavedOrder, StockNotification } from "./types";

/**
 * طبقة الباك إند لحفظ بيانات المطعم: القائمة والطلبات والمخزون.
 *
 * السائق الأساسي هو Supabase (Postgres) — هو اللي بيشتغل على Vercel وبيحفظ
 * البيانات بشكل دائم. ولو Supabase غير مُعدّ (تطوير محلي من غير مفاتيح) بيتم
 * استخدام ملف JSON محلي، وتظهر الحالة في لوحة التحكم.
 */

export class StoreError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "StoreError";
    this.status = status;
  }
}

export interface StorageStatus {
  driver: "supabase" | "file";
  /** هل البيانات محفوظة بشكل دائم (Supabase) ولا في ملف مؤقت (تطوير محلي) */
  persistent: boolean;
  /** Supabase مُعدّ لكن الجداول لسه مش جاهزة */
  needsSchema: boolean;
}

const DATABASE_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "restaurant.json");
const DRIVER_TTL = 60_000;
let driverCache: { status: StorageStatus; at: number } | null = null;

async function storageStatus(force = false): Promise<StorageStatus> {
  if (!force && driverCache && Date.now() - driverCache.at < DRIVER_TTL) return driverCache.status;

  let status: StorageStatus = { driver: "file", persistent: false, needsSchema: false };
  if (isSupabaseStoreConfigured()) {
    status = (await probeSupabaseStore())
      ? { driver: "supabase", persistent: true, needsSchema: false }
      : { driver: "file", persistent: false, needsSchema: true };
    if (status.needsSchema) {
      console.error(
        "[restaurant] جداول Supabase غير جاهزة — نفّذ supabase/schema.sql في SQL Editor عشان الحفظ يبقى دائم.",
      );
    }
  }
  driverCache = { status, at: Date.now() };
  return status;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  return storageStatus();
}

/* ------------------------------------------------------------------ */
/* ملف التطوير المحلي                                                  */
/* ------------------------------------------------------------------ */

interface FileDatabase {
  menu: MenuData;
  orders: SavedOrder[];
  notifications: StockNotification[];
}

const freshDatabase = (): FileDatabase => ({
  menu: normalizeData(structuredClone(DEFAULT_DATA)),
  orders: [],
  notifications: [],
});

let queue = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readFileDatabase(): Promise<FileDatabase> {
  let parsed: Partial<FileDatabase> | undefined;
  try {
    parsed = JSON.parse(
      await fs.readFile(/* turbopackIgnore: true */ DATABASE_PATH, "utf8"),
    ) as Partial<FileDatabase>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!parsed) {
    const initial = freshDatabase();
    await writeFileDatabase(initial);
    return initial;
  }
  return {
    menu: normalizeData(parsed.menu ?? DEFAULT_DATA),
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
  };
}

async function writeFileDatabase(database: FileDatabase) {
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
  const temporary = `${DATABASE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(database, null, 2), "utf8");
  await fs.rename(temporary, DATABASE_PATH);
}

/* ------------------------------------------------------------------ */
/* تنبيهات نقص المخزون                                                 */
/* ------------------------------------------------------------------ */

const LOW_STOCK_WEBHOOK = () => (process.env.LOW_STOCK_WEBHOOK_URL ?? "").trim();

/** إرسال التنبيه لأي خدمة خارجية (WhatsApp Business API / Make / n8n / Slack) */
function sendLowStockWebhook(notifications: StockNotification[]) {
  const url = LOW_STOCK_WEBHOOK();
  if (!url || notifications.length === 0) return;
  const payload = {
    type: "low_stock",
    sentAt: new Date().toISOString(),
    count: notifications.length,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      itemId: notification.itemId,
      itemName: notification.itemName,
      remaining: notification.remaining,
      threshold: notification.threshold,
    })),
  };
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.error("[restaurant] فشل إرسال webhook نقص المخزون", error);
  });
}

/* ------------------------------------------------------------------ */
/* الواجهة الموحّدة                                                    */
/* ------------------------------------------------------------------ */

export async function getMenu(token: string | null = null): Promise<MenuData> {
  const status = await storageStatus();
  if (status.driver === "supabase") {
    const result = await fetchPublishedMenu();
    if (result.ok && result.data) return result.data;
    if (result.code === "EMPTY") {
      // أول تشغيل: بيانات البداية بتتحفظ في قاعدة البيانات بأول جلسة أدمن
      const seed = normalizeData(structuredClone(DEFAULT_DATA));
      if (token) {
        const saved = await savePublishedMenu(seed, token);
        if (saved.ok && saved.data) return saved.data;
      }
      return seed;
    }
    throw new StoreError(result.message || "تعذّر قراءة القائمة", result.status === 404 ? 404 : 502);
  }
  return (await readFileDatabase()).menu;
}

export async function replaceMenu(menu: MenuData, token: string | null): Promise<MenuData> {
  const status = await storageStatus();
  const normalized = normalizeData({ ...menu, updatedAt: new Date().toISOString() });

  if (status.driver === "supabase") {
    if (!token) throw new StoreError("غير مصرّح", 401);
    const result = await savePublishedMenu(normalized, token);
    if (!result.ok) throw new StoreError(result.message || "تعذّر حفظ القائمة", result.status || 502);
    return result.data ?? normalized;
  }

  return serialized(async () => {
    const database = await readFileDatabase();
    database.menu = normalized;
    await writeFileDatabase(database);
    return database.menu;
  });
}

export async function createOrder(input: PlaceOrderInput): Promise<{ order: SavedOrder; lowStock: StockNotification[] }> {
  const status = await storageStatus();

  if (status.driver === "supabase") {
    const result = await placeOrder(input);
    if (!result.ok || !result.data) throw new StoreError(result.message || "تعذّر تسجيل الطلب", result.status || 400);
    const lowStock = result.data.lowStock ?? [];
    sendLowStockWebhook(lowStock);
    return { order: result.data.order, lowStock };
  }

  const { order, lowStock } = await serialized(() => createOrderInFile(input));
  sendLowStockWebhook(lowStock);
  return { order, lowStock };
}

/** تسجيل الطلب وخصم المخزون في ملف التطوير المحلي */
async function createOrderInFile(input: PlaceOrderInput) {
  const database = await readFileDatabase();
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new StoreError("السلة فارغة", 400);

  const orderLines: SavedOrder["lines"] = [];
  const lowStock: StockNotification[] = [];

  for (const line of input.lines) {
    const item = database.menu.items.find((candidate) => candidate.id === line.itemId);
    if (!item || !item.available) throw new StoreError("أحد الأصناف لم يعد متاحاً", 409);

    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
    if (item.trackStock) {
      const before = Math.max(0, item.stock ?? 0);
      if (quantity > before) throw new StoreError(`المتاح من ${item.name} هو ${before} فقط`, 409);
      item.stock = before - quantity;
      if (item.stock === 0) item.available = false;

      const threshold = Math.max(0, item.lowStockThreshold ?? 2);
      if (before > threshold && item.stock <= threshold) {
        const notification: StockNotification = {
          id: crypto.randomUUID(),
          itemId: item.id,
          itemName: item.name,
          remaining: item.stock,
          threshold,
          createdAt: new Date().toISOString(),
          read: false,
        };
        database.notifications.push(notification);
        lowStock.push(notification);
      }
    }
    orderLines.push({ itemId: item.id, name: item.name, quantity, unitPrice: item.price });
  }

  const order: SavedOrder = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customer: {
      name: input.customer?.name?.trim() ?? "",
      phone: input.customer?.phone?.trim() ?? "",
      address: input.customer?.address?.trim() ?? "",
      table: input.customer?.table?.trim() ?? "",
      notes: input.customer?.notes?.trim() ?? "",
    },
    orderType: input.orderType,
    lines: orderLines,
    total: Number(input.total) || 0,
  };

  database.orders.push(order);
  database.menu.updatedAt = new Date().toISOString();
  await writeFileDatabase(database);
  return { order, lowStock };
}

export async function getAdminOverview(token: string | null): Promise<AdminOverview> {
  const status = await storageStatus();

  if (status.driver === "supabase") {
    if (!token) throw new StoreError("غير مصرّح", 401);
    const result = await fetchAdminOverview(token);
    if (!result.ok || !result.data) throw new StoreError(result.message || "تعذّر قراءة بيانات اللوحة", result.status || 502);
    return result.data;
  }

  const database = await readFileDatabase();
  return {
    orders: database.orders.slice(-30).reverse(),
    notifications: database.notifications.slice(-50).reverse(),
    storage: { driver: "file", persistent: false },
  };
}

export async function markNotificationsRead(token: string | null): Promise<void> {
  const status = await storageStatus();

  if (status.driver === "supabase") {
    if (!token) throw new StoreError("غير مصرّح", 401);
    const result = await markAllNotificationsRead(token);
    if (!result.ok) throw new StoreError(result.message || "تعذّر تحديث التنبيهات", result.status || 502);
    return;
  }

  await serialized(async () => {
    const database = await readFileDatabase();
    database.notifications.forEach((notification) => (notification.read = true));
    await writeFileDatabase(database);
  });
}
