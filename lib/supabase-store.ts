import "server-only";

import {
  MENU_TABLE,
  NOTIFICATIONS_TABLE,
  ORDERS_TABLE,
  PLACE_ORDER_FUNCTION,
  PUBLISHED_SLUG,
} from "./supabase";
import { normalizeData } from "./normalize";
import type { AdminOverview, CartLine, MenuData, OrderType, SavedOrder, StockNotification } from "./types";

/**
 * مخزن البيانات السحابي — Supabase (Postgres) عن طريق REST API.
 *
 * بيستخدم مفتاح anon العام فقط:
 *   - قراءة القائمة: مسموحة للجميع (العملاء).
 *   - تعديل القائمة والطلبات والتنبيهات: بتوكن الأدمن (RLS لدور authenticated).
 *   - تسجيل الطلب: عن طريق دالة place_order في قاعدة البيانات (security definer)
 *     عشان خصم المخزون يحصل بشكل ذرّي ومفيش تضارب بين طلبين.
 */

export const SUPABASE_URL = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
export const SUPABASE_ANON_KEY = () => (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export function isSupabaseStoreConfigured(): boolean {
  return Boolean(SUPABASE_URL() && SUPABASE_ANON_KEY());
}

export interface RestResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
  code: string;
}

interface RestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  prefer?: string;
  apiKey?: string;
}

export async function rest<T>(path: string, options: RestOptions = {}): Promise<RestResult<T>> {
  const { method = "GET", body, token = null, prefer, apiKey } = options;
  const headers: Record<string, string> = {
    apikey: apiKey ?? SUPABASE_ANON_KEY(),
    authorization: `Bearer ${token ?? SUPABASE_ANON_KEY()}`,
    accept: "application/json",
  };
  if (prefer) headers.prefer = prefer;
  if (body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL()}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      code: "NETWORK",
      message: error instanceof Error ? error.message : "تعذّر الاتصال بقاعدة البيانات",
    };
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const error = parsed as { message?: string; code?: string } | null;
    return {
      ok: false,
      status: response.status,
      data: null,
      code: error?.code ?? `HTTP_${response.status}`,
      message: error?.message ?? `تعذّر تنفيذ العملية (${response.status})`,
    };
  }

  return { ok: true, status: response.status, data: parsed as T, message: "", code: "" };
}

/** كود PostgREST لما الجدول/الدالة مش موجودة — معناه إن schema.sql لسه متنفذتش */
const NOT_READY_CODES = new Set(["PGRST205", "PGRST202", "42P01", "42883"]);

interface MenuRow {
  slug: string;
  data: MenuData | null;
  updated_at: string;
}

export async function fetchPublishedMenu(): Promise<RestResult<MenuData>> {
  const result = await rest<MenuRow[]>(`${MENU_TABLE}?slug=eq.${PUBLISHED_SLUG}&select=slug,data,updated_at&limit=1`);
  if (!result.ok) return { ok: false, status: result.status, data: null, message: result.message, code: result.code };
  const row = result.data?.[0];
  if (!row?.data) return { ok: false, status: 404, data: null, message: "القائمة غير محفوظة بعد", code: "EMPTY" };
  return { ok: true, status: 200, data: normalizeData(row.data), message: "", code: "" };
}

/** فحص سريع: هل جداول قاعدة البيانات جاهزة؟ */
export async function probeSupabaseStore(): Promise<boolean> {
  if (!isSupabaseStoreConfigured()) return false;
  const result = await rest<Array<{ slug: string }>>(`${MENU_TABLE}?slug=eq.${PUBLISHED_SLUG}&select=slug&limit=1`);
  return result.ok || !NOT_READY_CODES.has(result.code);
}

export async function savePublishedMenu(menu: MenuData, token: string): Promise<RestResult<MenuData>> {
  const payload = { slug: PUBLISHED_SLUG, data: menu, updated_at: menu.updatedAt };
  const result = await rest<MenuRow[]>(MENU_TABLE, {
    method: "POST",
    body: payload,
    token,
    prefer: "resolution=merge-duplicates,return=representation",
  });
  if (!result.ok) return { ok: false, status: result.status, data: null, message: result.message, code: result.code };
  return { ok: true, status: 200, data: normalizeData(result.data?.[0]?.data ?? menu), message: "", code: "" };
}

export interface PlaceOrderInput {
  lines: CartLine[];
  customer: { name?: string; phone?: string; address?: string; table?: string; notes?: string };
  orderType: OrderType;
  total: number;
}

interface PlaceOrderResult {
  order: SavedOrder;
  lowStock: StockNotification[];
}

export async function placeOrder(input: PlaceOrderInput): Promise<RestResult<PlaceOrderResult>> {
  return rest<PlaceOrderResult>(`rpc/${PLACE_ORDER_FUNCTION}`, {
    method: "POST",
    body: { payload: input },
  });
}

interface OrderRow {
  id: string;
  created_at: string;
  data: SavedOrder;
}

interface NotificationRow {
  id: string;
  item_id: string;
  item_name: string;
  remaining: number;
  threshold: number;
  created_at: string;
  read: boolean;
}

const toNotification = (row: NotificationRow): StockNotification => ({
  id: row.id,
  itemId: row.item_id,
  itemName: row.item_name,
  remaining: row.remaining,
  threshold: row.threshold ?? 2,
  createdAt: row.created_at,
  read: Boolean(row.read),
});

export async function fetchAdminOverview(token: string): Promise<RestResult<AdminOverview>> {
  const [orders, notifications] = await Promise.all([
    rest<OrderRow[]>(`${ORDERS_TABLE}?select=id,created_at,data&order=created_at.desc&limit=30`, { token }),
    rest<NotificationRow[]>(
      `${NOTIFICATIONS_TABLE}?select=*&order=created_at.desc&limit=50`,
      { token },
    ),
  ]);
  if (!orders.ok) return { ok: false, status: orders.status, data: null, message: orders.message, code: orders.code };
  if (!notifications.ok)
    return {
      ok: false,
      status: notifications.status,
      data: null,
      message: notifications.message,
      code: notifications.code,
    };

  return {
    ok: true,
    status: 200,
    code: "",
    message: "",
    data: {
      orders: (orders.data ?? []).map((row) => row.data),
      notifications: (notifications.data ?? []).map(toNotification),
      storage: { driver: "supabase", persistent: true },
    },
  };
}

export async function markAllNotificationsRead(token: string): Promise<RestResult<unknown>> {
  return rest(`${NOTIFICATIONS_TABLE}?read=eq.false`, {
    method: "PATCH",
    body: { read: true },
    token,
    prefer: "return=minimal",
  });
}
