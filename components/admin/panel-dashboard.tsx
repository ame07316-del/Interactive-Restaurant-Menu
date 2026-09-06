"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CircleCheck,
  Database,
  Plus,
  Receipt,
  TriangleAlert,
  UtensilsCrossed,
  FolderTree,
  Wallet,
  Bell,
  Package,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { Badge, Button, Panel } from "@/components/ui";
import { cx } from "@/lib/cx";

export function DashboardPanel({ onJump }: { onJump: (tab: string, payload?: string) => void }) {
  const { data, isCustomized, storageKb } = useMenu();
  const { items, categories, brand, contact, commerce, admin } = data;
  const [overview, setOverview] = useState<{ orders: Array<{ id: string; total: number; createdAt: string }>; notifications: Array<{ id: string; itemName: string; remaining: number; read: boolean }> }>({ orders: [], notifications: [] });

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" }).then((response) => response.ok ? response.json() : overview).then(setOverview).catch(() => undefined);
    // تحميل مرة عند فتح لوحة المتابعة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const soldOut = items.filter((item) => !item.available).length;
    const offers = items.filter((item) => item.oldPrice && item.oldPrice > item.price).length;
    const noImage = items.filter((item) => !item.image?.trim()).length;
    const avg = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.price, 0) / items.length)
      : 0;
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
      fix: "كل الأقسام مقفلة من الظهور",
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
      ok: !admin.lockAdmin,
      label: "قفل الأدمين",
      fix: `الرقم السري الحالي: ${admin.pin}`,
      tab: "data",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<UtensilsCrossed className="h-4 w-4" />} label="الأصناف" value={String(items.length)} hint={`${stats.soldOut} خلصت`} />
        <Stat icon={<FolderTree className="h-4 w-4" />} label="الأقسام" value={String(categories.length)} hint={`${categories.filter((c) => c.visible).length} ظاهر`} />
        <Stat icon={<Receipt className="h-4 w-4" />} label="عروض وخصومات" value={String(stats.offers)} hint="سعر قبل الخصم" />
        <Stat icon={<Wallet className="h-4 w-4" />} label="متوسط السعر" value={`${stats.avg} ${commerce.currency}`} hint="لكل صنف" />
      </div>

      {overview.notifications.filter((notification) => !notification.read).length > 0 ? (
        <Panel
          title="تنبيهات المخزون"
          description="رسالة تلقائية عند وصول أي صنف للحد اللي حددته"
          icon={<Bell className="h-4 w-4" />}
          actions={<Button size="sm" variant="outline" onClick={async () => { await fetch("/api/admin/overview", { method: "PATCH" }); setOverview((current) => ({ ...current, notifications: current.notifications.map((row) => ({ ...row, read: true })) })); }}>تحديد كمقروء</Button>}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {overview.notifications.filter((notification) => !notification.read).slice(0, 6).map((notification) => (
              <div key={notification.id} className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <Package className="h-5 w-5 shrink-0 text-amber-400" />
                <div><p className="text-xs font-black">{notification.itemName}</p><p className="text-[11px] text-amber-300">متبقي {notification.remaining} فقط — راجع المخزون</p></div>
              </div>
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
                  <button
                    onClick={() => onJump(check.tab)}
                    className="shrink-0 text-[11px] font-black text-accent hover:underline"
                  >
                    عدّل <ArrowUpRight className="inline h-3 w-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel title="حفظ سحابي" description="أي تعديل بيتخزن أوتوماتيك في الباك إند" icon={<Database className="h-4 w-4" />}>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
                <span className="text-muted">التخزين المستخدم</span>
                <span className="font-black">{storageKb} KB</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.min(100, (storageKb / 5000) * 100)}%` }}
                />
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

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
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
    <button
      onClick={onClick}
      className="rounded-xl border border-line bg-surface-2/50 p-3 text-start transition hover:border-accent/50"
    >
      <p className="text-xs font-black">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </button>
  );
}
