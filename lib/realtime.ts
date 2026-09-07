import { createBrowserClient } from "./supabase";

/**
 * تحديث لحظي (Supabase Realtime / Postgres logical replication).
 *
 * أي تغيير في الجداول المفعّلة في publication "supabase_realtime" بيوصل
 * لكل الأجهزة فوراً عن طريق WebSocket — من غير ريفريش ومن غير polling:
 *   - menu_data          → العملاء بيستلموا القائمة الجديدة فوراً (خصم مخزون / تعديل أدمن)
 *   - orders             → لوحة الأدمن بتستلم الطلب الجديد فوراً
 *   - stock_notifications → تنبيه نقص المخزون يظهر فوراً
 *
 * الصلاحيات بتحكمها RLS حتى على الـ Realtime:
 *   - anon يقدر يستمع على menu_data (قراءة عامة)
 *   - authenticated (الأدمن) بس يقدر يستمع على orders و stock_notifications
 *
 * لازم الجداول تكون مضافة لـ publication في قاعدة البيانات — شوف supabase/schema.sql.
 */

export interface RealtimeTableSubscription {
  table: string;
  /** نوع الحدث — افتراضي "*" (أي تغيير) */
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  /** فلتر PostgREST على الصف، مثال: "slug=eq.main" */
  filter?: string;
}

/**
 * يشترك في تغييرات جداول معيّنة وينادي onChange فور أي تغيير.
 * بيرجّع دالة الإلغاء — استخدمها في cleanup بتاع useEffect.
 */
export function subscribeRealtime(
  channelName: string,
  subscriptions: RealtimeTableSubscription[],
  onChange: (table: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const client = createBrowserClient();
  if (!client) return () => {};

  const channel = client.channel(channelName);
  for (const sub of subscriptions) {
    channel.on(
      "postgres_changes",
      {
        event: sub.event ?? "*",
        schema: "public",
        table: sub.table,
        ...(sub.filter ? { filter: sub.filter } : {}),
      },
      () => onChange(sub.table),
    );
  }
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
