"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CircleCheck,
  Database,
  FolderTree,
  Package,
  Plus,
  Receipt,
  TriangleAlert,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { Badge, Button, Panel } from "@/components/ui";
import { cx } from "@/lib/cx";
import { authenticatedFetch } from "@/lib/supabase-auth-core";
import type { AdminOverview, SavedOrder, StockNotification } from "@/lib/types";

interface OverviewState {
  orders: SavedOrder[];
  notifications: StockNotification[];
  storage: { driver: "supabase" | "file"; persistent: boolean };
}

const EMPTY_OVERVIEW: OverviewState = {
  orders: [],
  notifications: [],
  storage: { driver: "file", persistent: false },
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "دليفري",
  takeaway: "تيك أواي",
  dinein: "محلي",
};

export function DashboardPanel({ onJump }: { onJump: (tab: string, payload?: string) => void }) {
  const { data, isCustomized, storageKb } = useMenu();
  const { items, categories, brand, contact, commerce } = data;
  const supabaseAuth = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [overview, setOverview] = useState<OverviewState>(EMPTY_OVERVIEW);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/admin/overview", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setOverviewError(payload?.error ?? "تعذّر قراءة بيانات اللوحة");
        return;
      }
      const result = (await response.json()) as AdminOverview;
      setOverview({
        orders: result.orders ?? [],
        notifications: result.notifications ?? [],
        storage: result.storage ?? EMPTY_OVERVIEW.storage,
      });
      setOverviewError(null);
    } catch {
      setOverviewError("تعذّر الاتصال بالباك إند");
    }
  }, []);

  useEffect(() => {
    // متابعة لحظية: أي طلب جديد أو تنبيه مخزون يظهر في اللوحة من غير ريفريش
    const timer = window.setInterval(() => void loadOverview(), 15_000);
    const kick = window.setTimeout(() => void loadOverview(), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(kick);
    };
  }, [loadOverview]);

  const unread = useMemo(
    () => overview.notifications.filter((notification) => !notification.read),
    [overview.notifications],
  );

  const lowStockItems = useMemo(
    () =>
      items
        .filter((item) => item.trackStock && (item.stock ?? 0) <= (item.lowStockThreshold ?? 2))
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
    [items],
  );

  const stats = useMemo(() => {
    const soldOut = items.filter((item) => !item.available).length;
    const offers = items.filter((item) => item.oldPrice && item.oldPrice > item.price).length;
    const noImage = items.filter((item) => !item.image?.trim()).length;
    const avg = items.length ? Math.round(items.reduce((sum, item) => sum + item.price, 0) / items.length) : 0;
    return { soldOut, offers, noImage, avg };
  }, [items]);

  const checks = [
    {
      ok: /^\d{9,15}$/.test(contact.whatsapp.replace(/\D/g, "")),
      label: "رقم الواتساب",
      fix: "حدد رقم الواتساب في تبويب الطلبات",
      tab: "ordering",
    },
    {
      ok: !!brand.restaurantName.trim(),
      label: "اسم المطعم",
      fix: "اسم المطعم فاضي",
      tab: "brand",
    },
    { ok: stats.noImage === 0, label: "صور الأصناف", fix: `${stats.noImage} صنف بدون صورة`, tab: "items" },
    { ok: items.length > 0, label: "الأصناف", fix: "أضف أول صنف للقائمة", tab: "items" },
    {
      ok: categories.some((category) => category.visible),
      label: "الأقسام الظاهرة",
      fix: "كل الأقسام مقفولة من الظهور",
      tab: "categories",
    },
    {
      ok: items.every((item) => categories.some((category) => category.id === item.categoryId)),
      label: "تصنيف الأصناف",
      fix: "في أصناف قسمها اتحذف",
      tab: "items",
    },
    {
      ok: contact.isOpen,
      label: "حالة المطعم",
      fix: contact.closedMessage || "المطعم مقفل حالياً",
      tab: "ordering",
    },
    {
      ok: supabaseAuth,
      label: "مصادقة الأدمن",
      fix: "أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY",
      tab: "data",
    },
    {
      ok: overview.storage.persistent,
      label: "قاعدة البيانات",
      fix: "التخزين الحالي مؤقت — نفّذ supabase/schema.sql في Supabase",
      tab: "data",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<UtensilsCrossed className="h-4 w-4" />} label="الأصناف" value={String(items.length)} hint={`${stats.soldOut} خلصت`} />
        <Stat icon={<FolderTree className="h-4 w-4" />} label="الأقسام" value={String(categories.length)} hint={`${categories.filter((c) => c.visible).length} ظاهر`} />
        <Stat icon={<Receipt className="h-4 w-4" />} label="طلبات مسجّلة" value={String(overview.orders.length)} hint="محفوظة في الباك إند" />
        <Stat icon={<Wallet className="h-4 w-4" />} label="متوسط السعر" value={`${stats.avg} ${commerce.currency}`} hint="لكل صنف" />
      </div>

      {!overview.storage.persistent ? (
        <div className="rounded-card border border-red-500/30 bg-red-500/10 p-3 text-[11px] leading-relaxed text-red-300">
          <p className="font-black">قاعدة البيانات الحالية تخزين مؤقت</p>
          <p className="mt-1">
            البيانات بتتحفظ في ملف مؤقت على السيرفر وهتضيع مع كل إعادة تشغيل. عشان الحفظ يبقى دائم على Vercel
            نفّذ محتوى <span dir="ltr" className="font-mono">supabase/schema.sql</span> مرة واحدة في Supabase → SQL Editor،
            وبعدها كل حاجة (القائمة، الطلبات، المخزون) هتتحفظ في Postgres.
          </p>
        </div>
      ) : null}

      {overviewError ? (
        <div className="rounded-card border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-bold text-amber-300">
          {overviewError}
        </div>
      ) : null}

      {unread.length > 0 ? (
        <Panel
          title={`تنبيهات نقص المخزون (${unread.length})`}
          description="تُنشأ تلقائياً عند وصول الكمية للحد المحدد (الافتراضي 2)"
          icon={<Bell className="h-4 w-4" />}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await authenticatedFetch("/api/admin/overview", { method: "PATCH" });
                setOverview((current) => ({
                  ...current,
                  notifications: current.notifications.map((row) => ({ ...row, read: true })),
                }));
              }}
            >
              تحديد كمقروء
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {unread.slice(0, 6).map((notification) => (
              <div key={notification.id} className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <Package className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs font-black">{notification.itemName}</p>
                  <p className="text-[11px] text-amber-300">
                    متبقي {notification.remaining} (حد التنبيه {notification.threshold}) — راجع المخزون
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            التنبيه نفسه بيتبعت للـ webhook لو <span dir="ltr" className="font-mono">LOW_STOCK_WEBHOOK_URL</span> متظبط.
          </p>
        </Panel>
      ) : null}

      {lowStockItems.length > 0 ? (
        <Panel
          title="أصناف قربت تخلص"
          description="الكمية الحالية مقارنة بحد التنبيه"
          icon={<Package className="h-4 w-4" />}
          actions={<Button size="sm" variant="outline" onClick={() => onJump("items")}>تعديل الكميات</Button>}
        >
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 12).map((item) => (
              <span
                key={item.id}
                className={cx(
                  "rounded-xl border px-2.5 py-1.5 text-[11px] font-bold",
                  (item.stock ?? 0) === 0
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                )}
              >
                {item.name} — {item.stock ?? 0}
              </span>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="صحة القائمة" description="كل النقاط دي لازم تبقى خضراء قبل ما تفتح للعملاء" icon={<CircleCheck className="h-4 w-4" />}>
          <ul className="space-y-2">
            {checks.map((check) => (
              <li
                key={check.label}
                className={cx(
                  "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5",
                  check.ok ? "border-line bg-surface-2/50" : "border-amber-500/30 bg-amber-500/8",
                )}
              >
                <span className="flex items-start gap-2 text-xs font-bold">
                  {check.ok ? (
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  )}
                  <span className="flex flex-col">
                    {check.label}
                    {!check.ok ? <span className="mt-0.5 text-[11px] font-medium text-muted">{check.fix}</span> : null}
                  </span>
                </span>
                {!check.ok ? (
                  <button onClick={() => onJump(check.tab)} className="shrink-0 text-[11px] font-black text-accent hover:underline">
                    عدّل <ArrowUpRight className="inline h-3 w-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel title="آخر الطلبات" description="مسجّلة في الباك إند مع خصم المخزون" icon={<Receipt className="h-4 w-4" />}>
            {overview.orders.length === 0 ? (
              <p className="rounded-xl border border-line bg-surface-2/40 p-3 text-[11px] text-muted">
                لسه مفيش طلبات — أول طلب من الموقع هيتسجّل هنا فوراً.
              </p>
            ) : (
              <ul className="space-y-2">
                {overview.orders.slice(0, 5).map((order) => (
                  <li key={order.id} className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span dir="ltr" className="font-mono text-[11px] font-black text-accent">
                        {order.id}
                      </span>
                      <span className="text-[11px] font-black">
                        {order.total} {commerce.currency}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {order.customer?.name || "عميل"} · {ORDER_TYPE_LABEL[order.orderType] ?? order.orderType} ·{" "}
                      {new Date(order.createdAt).toLocaleString("ar-EG")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {order.lines?.map((line) => `${line.name} ×${line.quantity}`).join("، ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="حفظ سحابي" description="أي تعديل بيتخزن أوتوماتيك في الباك إند" icon={<Database className="h-4 w-4" />}>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
                <span className="text-muted">حجم بيانات القائمة</span>
                <span className="font-black">{storageKb} KB</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (storageKb / 5000) * 100)}%` }} />
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                {isCustomized
                  ? "التعديلات محفوظة في قاعدة بيانات الموقع ومتاحة فوراً لكل العملاء والأجهزة."
                  : "جاري تجهيز قاعدة بيانات الموقع."}
              </p>
              <Badge tone={isCustomized ? "success" : "neutral"}>
                {isCustomized ? "متصل بالباك إند" : "جاري الاتصال"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onJump("data")}>
                <Database className="h-3.5 w-3.5" /> تصدير / استيراد
              </Button>
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/60 hover:text-accent"
              >
                فتح الموقع <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </Panel>

          <Panel title="إجراءات سريعة" icon={<Plus className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction label="صنف جديد" hint="أضف أكلة للقائمة" onClick={() => onJump("items", "new")} />
              <QuickAction label="قسم جديد" hint="صنّف أكلك أحسن" onClick={() => onJump("categories", "new")} />
              <QuickAction label="غيّر اللون" hint="لون الموقع كله" onClick={() => onJump("look")} />
              <QuickAction label="إعلان علوي" hint="عرض أو خصم" onClick={() => onJump("brand")} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted">
        <span className="text-accent">{icon}</span>
        {label}
      </span>
      <p className="text-xl font-black leading-none">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted/80">{hint}</p> : null}
    </div>
  );
}

function QuickAction({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-line bg-surface-2/50 p-3 text-start transition hover:border-accent/50">
      <p className="text-xs font-black">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </button>
  );
}
