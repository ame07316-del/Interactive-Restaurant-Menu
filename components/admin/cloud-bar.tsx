"use client";

import { useState } from "react";
import {
  CircleCheck,
  CloudOff,
  CloudUpload,
  LoaderCircle,
  RefreshCw,
  Save,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { cx } from "@/lib/cx";
import { Button, Toast, useToast } from "@/components/ui";
import type { CloudState } from "@/lib/menu-store-core";

/** الوقت بشكل مقروء: «من ٣ دقايق» */
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "دلوقتي";
  if (minutes < 60) return `من ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `من ${hours} ساعة`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

/** شارة حالة المزامنة مع Supabase */
export function CloudChip({ cloud, compact = false }: { cloud: CloudState; compact?: boolean }) {
  const map: Record<
    string,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    off: {
      label: "محلي فقط",
      className: "text-muted border-line bg-surface",
      icon: <CloudOff className="h-3 w-3" />,
    },
    connecting: {
      label: "جاري الاتصال…",
      className: "text-muted border-line bg-surface",
      icon: <LoaderCircle className="h-3 w-3 animate-spin" />,
    },
    syncing: {
      label: "بيرفع…",
      className: "text-amber-300 border-amber-500/30 bg-amber-500/10",
      icon: <LoaderCircle className="h-3 w-3 animate-spin" />,
    },
    publishing: {
      label: "بينشر…",
      className: "text-amber-300 border-amber-500/30 bg-amber-500/10",
      icon: <CloudUpload className="h-3 w-3 animate-pulse" />,
    },
    live: {
      label: cloud.hasUnpublished ? "مسودة غير منشورة" : "منشور ✓",
      className: cloud.hasUnpublished
        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
        : "text-emerald-400 border-emerald-500/25 bg-emerald-500/10",
      icon: cloud.hasUnpublished ? <Save className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />,
    },
    error: {
      label: "فشل الاتصال",
      className: "text-red-400 border-red-500/30 bg-red-500/10",
      icon: <TriangleAlert className="h-3 w-3" />,
    },
  };

  const current = map[cloud.status] ?? map.off;
  const title =
    cloud.status === "error"
      ? cloud.error ?? "فشل الاتصال بالسحابة"
      : cloud.status === "off"
        ? "Supabase مش متظبط — التعديلات محفوظة في المتصفح بس"
        : `آخر نشر: ${relativeTime(cloud.publishedAt)}`;

  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black",
        current.className,
        compact && "px-2",
      )}
    >
      {current.icon}
      {compact ? null : current.label}
    </span>
  );
}

/** شريط النشر: الحالة + «حفظ ونشر» + «حفظ كمسودة» + إعادة المحاولة */
export function CloudBar() {
  const { cloud, publishNow, saveDraftNow, retryCloud } = useMenu();
  const [busy, setBusy] = useState<"publish" | "draft" | "retry" | null>(null);
  const { toast, show } = useToast();

  const disabled = !cloud.enabled || !cloud.authed || busy !== null;

  const run = async (kind: "publish" | "draft" | "retry") => {
    setBusy(kind);
    try {
      const ok =
        kind === "publish" ? await publishNow() : kind === "draft" ? await saveDraftNow() : await retryCloud();
      if (ok) {
        show(
          kind === "publish"
            ? "اتنشر ✓ كل العملاء شايفين النسخة الجديدة"
            : kind === "draft"
              ? "المسودة اتحفظت — العملاء لسه شايفين آخر نسخة منشورة"
              : "المزامنة رجعت ✓",
        );
      } else {
        show(cloud.error ?? "فشل الاتصال بالسحابة — جرّب تاني", "error");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <CloudChip cloud={cloud} />

        {cloud.status === "error" ? (
          <Button size="sm" variant="outline" onClick={() => run("retry")} disabled={busy !== null}>
            {busy === "retry" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            إعادة المحاولة
          </Button>
        ) : null}

        {cloud.enabled && cloud.authed ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("draft")}
              disabled={disabled}
              title="بيتخزن في Supabase كمسودة — العميل مش هيشوفه"
            >
              {busy === "draft" ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">حفظ كمسودة</span>
            </Button>
            <Button
              size="sm"
              onClick={() => run("publish")}
              disabled={disabled}
              title="بيتنشر لكل العملاء في نفس الثانية"
            >
              {busy === "publish" ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              حفظ ونشر
            </Button>
          </>
        ) : null}
      </div>
      {toast ? <Toast message={toast.text} tone={toast.tone} /> : null}
    </>
  );
}
