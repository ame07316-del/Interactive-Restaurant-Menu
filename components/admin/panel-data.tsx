"use client";

import { useRef, useState } from "react";
import {
  Cloud,
  Copy,
  Database,
  Download,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { useAdminSession } from "@/lib/use-admin-session";
import { Button, Panel, TextInput, Toast, useToast } from "@/components/ui";

export function DataPanel() {
  const { data, exportJson, importJson, resetToDefaults, storageKb, isCustomized, saveError } = useMenu();
  const { email } = useAdminSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const { toast, show } = useToast();

  const json = exportJson();
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const menuUrl = `${siteUrl}/`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(menuUrl)}`;

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      show(message);
    } catch {
      show("المتصفح منع النسخ — ظلّل النص يدوياً", "error");
    }
  };

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `menu-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    show("النسخة الاحتياطية اتنزّلت على جهازك");
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const result = importJson(text);
    show(result.ok ? "تم الاستيراد وحُفظ في الباك إند ✅" : result.error ?? "حصلت مشكلة", result.ok ? "success" : "error");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Panel
        title="نسخة احتياطية من بيانات الباك إند"
        description="كل الإعدادات والأصناف والمخزون المحفوظة في قاعدة البيانات"
        icon={<Database className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5" /> تنزيل JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => copy(json, "النسخة الكاملة اتنسخت")}>
            <Copy className="h-3.5 w-3.5" /> نسخ JSON
          </Button>
          <span className="text-[11px] text-muted">
            {isCustomized ? "متصل بالباك إند" : "جاري الاتصال"} · {storageKb} KB
          </span>
        </div>
        {saveError ? (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] leading-relaxed text-red-300">
            {saveError}
          </p>
        ) : (
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            التعديلات بتتحفظ في قاعدة بيانات الموقع أوتوماتيك، وتظهر لكل العملاء فوراً على أي جهاز.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="استيراد نسخة احتياطية" icon={<Upload className="h-4 w-4" />}>
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            اختار ملف JSON صدرته قبل كده وهيحلّ محل بيانات الموقع في الباك إند فوراً.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
          <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> اختيار ملف
          </Button>
          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] font-bold text-muted hover:text-ink">أو الصق الـ JSON يدوياً</summary>
            <textarea
              value={paste}
              onChange={(event) => setPaste(event.target.value)}
              rows={5}
              placeholder='{"items":[…]}'
              className="mt-2 w-full rounded-xl border border-line bg-surface-2 p-2.5 font-mono text-[11px] outline-none focus:border-accent"
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const result = importJson(paste);
                  show(result.ok ? "تم الاستيراد ✅" : result.error ?? "خطأ", result.ok ? "success" : "error");
                  if (result.ok) setPaste("");
                }}
              >
                استيراد
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPaste("")}>
                تفريغ
              </Button>
            </div>
          </details>
        </Panel>

        <Panel
          title="الدخول والصلاحيات"
          description="Supabase Auth — حساب واحد للأدمن"
          icon={<ShieldCheck className="h-4 w-4" />}
        >
          <div className="space-y-2.5 text-[11px] leading-relaxed">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
              <Cloud className="h-4 w-4 shrink-0 text-accent" />
              <span className="font-bold">الحساب الحالي:</span>
              <span dir="ltr" className="font-mono text-muted">
                {email ?? "—"}
              </span>
            </div>
            <p className="flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-2.5 text-emerald-300">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              الدخول للوحة يتم بالإيميل والباسورد من حساب الأدمن في Supabase (Authentication → Users) فقط.
            </p>
            <p className="text-muted">
              كل طلبات الأدمن (حفظ القائمة، الطلبات، تنبيهات المخزون) بتتحقق من access token على السيرفر،
              وأي طلب من غير توكن صالح بيرجع 401. إدارة الحسابات (إضافة أو إيقاف مستخدم) من لوحة Supabase.
            </p>
          </div>
        </Panel>
      </div>

      <Panel
        title="رابط القائمة وكود QR"
        description="اطبعه وحطه على الطرابيزات أو على استيكر الدليفري"
        icon={<QrCode className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-56 flex-1 space-y-2">
            <TextInput readOnly value={menuUrl} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(menuUrl, "لينك القائمة اتنسخ")}>
                <Copy className="h-3.5 w-3.5" /> نسخ اللينك
              </Button>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/60 hover:text-accent"
              >
                <QrCode className="h-3.5 w-3.5" /> تكبير الكود للطباعة
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              الكود بيتولّد من خدمة صورة عامة (qrserver.com) وقت العرض، وبيقرأ دومين الموقع الحالي تلقائياً.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code للقائمة" className="h-28 w-28 rounded-xl border border-line bg-white p-1.5" />
        </div>
      </Panel>

      <Panel
        title="منطقة الخطر"
        description="إرجاع بيانات الموقع في الباك إند لبيانات البداية"
        icon={<RefreshCw className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {confirmReset ? (
            <>
              <span className="text-xs font-bold text-red-400">متأكد؟ بيانات الموقع الحالية في قاعدة البيانات هتتمسح.</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  resetToDefaults();
                  setConfirmReset(false);
                  show("رجّعنا كل حاجة لبيانات البداية");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> نعم، امسح
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                إلغاء
              </Button>
            </>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> إعادة الضبط
            </Button>
          )}
          <span className="text-[11px] text-muted">
            {isCustomized
              ? `آخر تحديث: ${new Date(data.updatedAt).toLocaleString("ar-EG")}`
              : "جاري الاتصال بقاعدة البيانات"}
          </span>
        </div>
      </Panel>

      {toast ? <Toast message={toast.text} tone={toast.tone} /> : null}
    </div>
  );
}
