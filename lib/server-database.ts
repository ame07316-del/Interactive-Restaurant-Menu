import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_DATA } from "./defaults";
import { normalizeData } from "./storage";
import type { CartLine, MenuData, OrderType } from "./types";

export interface SavedOrder {
  id: string;
  createdAt: string;
  customer: { name: string; phone: string; address: string; table: string; notes: string };
  orderType: OrderType;
  lines: Array<{ itemId: string; name: string; quantity: number; unitPrice: number }>;
  total: number;
}

export interface StockNotification {
  id: string;
  itemId: string;
  itemName: string;
  remaining: number;
  createdAt: string;
  read: boolean;
}

interface Database {
  menu: MenuData;
  orders: SavedOrder[];
  notifications: StockNotification[];
}

const DATABASE_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "restaurant.json");
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = "restaurant:database:v1";
let queue = Promise.resolve();

const freshDatabase = (): Database => ({ menu: normalizeData(structuredClone(DEFAULT_DATA)), orders: [], notifications: [] });

async function redis(command: unknown[]) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("تعذر الاتصال بقاعدة البيانات السحابية");
  return (await response.json()) as { result: unknown };
}

async function readDatabase(): Promise<Database> {
  let parsed: Partial<Database> | undefined;
  if (REDIS_URL && REDIS_TOKEN) {
    const value = (await redis(["GET", REDIS_KEY]))?.result;
    if (typeof value === "string") parsed = JSON.parse(value) as Partial<Database>;
  } else {
    try {
      parsed = JSON.parse(await fs.readFile(/* turbopackIgnore: true */ DATABASE_PATH, "utf8")) as Partial<Database>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  if (!parsed) {
    const initial = freshDatabase();
    await writeDatabase(initial);
    return initial;
  }
  return {
    menu: normalizeData(parsed.menu ?? DEFAULT_DATA),
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
  };
}

async function writeDatabase(database: Database) {
  if (REDIS_URL && REDIS_TOKEN) {
    await redis(["SET", REDIS_KEY, JSON.stringify(database)]);
    return;
  }
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
  const temporary = `${DATABASE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(database, null, 2), "utf8");
  await fs.rename(temporary, DATABASE_PATH);
}

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

export async function getMenu() {
  return (await readDatabase()).menu;
}

export async function replaceMenu(menu: MenuData) {
  return serialized(async () => {
    const database = await readDatabase();
    database.menu = normalizeData({ ...menu, updatedAt: new Date().toISOString() });
    await writeDatabase(database);
    return database.menu;
  });
}

export async function getAdminOverview() {
  const database = await readDatabase();
  return {
    orders: database.orders.slice(-30).reverse(),
    notifications: database.notifications.slice(-50).reverse(),
  };
}

export async function markNotificationsRead() {
  return serialized(async () => {
    const database = await readDatabase();
    database.notifications.forEach((notification) => (notification.read = true));
    await writeDatabase(database);
  });
}

export async function createOrder(input: {
  lines: CartLine[];
  customer: { name?: string; phone?: string; address?: string; table?: string; notes?: string };
  orderType: OrderType;
  total: number;
}) {
  return serialized(async () => {
    const database = await readDatabase();
    if (!Array.isArray(input.lines) || input.lines.length === 0) throw new Error("السلة فارغة");

    const orderLines: SavedOrder["lines"] = [];
    const lowStock: StockNotification[] = [];
    for (const line of input.lines) {
      const item = database.menu.items.find((candidate) => candidate.id === line.itemId);
      if (!item || !item.available) throw new Error("أحد الأصناف لم يعد متاحاً");
      const quantity = Math.max(1, Math.floor(Number(line.quantity)));
      if (item.trackStock) {
        const stock = Math.max(0, item.stock ?? 0);
        if (quantity > stock) throw new Error(`المتاح من ${item.name} هو ${stock} فقط`);
        item.stock = stock - quantity;
        if (item.stock === 0) item.available = false;
        const threshold = Math.max(0, item.lowStockThreshold ?? 2);
        if (stock > threshold && item.stock <= threshold) {
          const notification: StockNotification = {
            id: crypto.randomUUID(), itemId: item.id, itemName: item.name,
            remaining: item.stock, createdAt: new Date().toISOString(), read: false,
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
        name: input.customer.name?.trim() ?? "", phone: input.customer.phone?.trim() ?? "",
        address: input.customer.address?.trim() ?? "", table: input.customer.table?.trim() ?? "",
        notes: input.customer.notes?.trim() ?? "",
      },
      orderType: input.orderType,
      lines: orderLines,
      total: Number(input.total) || 0,
    };
    database.orders.push(order);
    database.menu.updatedAt = new Date().toISOString();
    await writeDatabase(database);

    if (lowStock.length && process.env.LOW_STOCK_WEBHOOK_URL) {
      void fetch(process.env.LOW_STOCK_WEBHOOK_URL, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "low_stock", notifications: lowStock }),
      }).catch(() => undefined);
    }
    return { order, lowStock };
  });
}
