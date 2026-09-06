"use client";

import { useRef, useState } from "react";
import {
  Braces,
  Copy,
  Database,
  Download,
  Info,
  Link2,
  Lock,
  QrCode,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useMenu } from "@/lib/use-menu";
import { Button, Field, Panel, Toast, TextInput, Toggle, useToast } from "@/components/ui";

export function DataPanel() {
  const { data, patchAdmin, exportJson, importJson, resetToDefaults, storageKb, isCustomized } = useMenu();
  const admin = data.admin;
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showPin, setShowPin] = useState(false);
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
    show("الملف اتنزّل على جهازك");
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const result = importJson(text);
    show(result.ok ? "تم استيراد البيانات ✅" : result.error ?? "حصلت مشكلة", result.ok ? "success" : "error");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Panel
        title="نشر التعديلات لكل العملاء"
        description="نسخة احتياطية من بيانات الباك إند للاسترجاع أو النقل"
        icon={<Database className="h-4 w-4" />}
      >
        <ol className="space-y-2.5">
          {[
            {
              title: "صدّر القائمة كملف JSON",
              body: "اضغط زر «تنزيل JSON» تحت — هيكون عندك نسخة كاملة من كل الإعدادات والأصناف.",
            },
            {
              title: "استبدل البيانات الافتراضية في lib/defaults.ts",
              body: "افتح الملف، وانسخ الكائن JSON مكان DEFAULT_DATA (version و updatedAt اتوماتيك).",
            },
            {
              title: "ابعت التعديل للريبو واعمل Deploy",
              body: "git commit + git push → فيرسل هيعيد البناء وكل العملاء هيشوفوا القائمة الجديدة.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent text-[11px] font-black text-accent-contrast">
                {index + 1}
              </span>
              <div>
                <p className="text-xs font-black">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5" /> تنزيل JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => copy(json, "الكوبي كاملة اتنسخت")}>
            <Copy className="h-3.5 w-3.5" /> نسخ JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => copy(`export const DEFAULT_DATA = ${json};`, "نسخة الـ TS جاهزة للّصق في lib/defaults.ts")}>
            <Braces className="h-3.5 w-3.5" /> نسخ كـ TypeScript
          </Button>
          <span className="text-[11px] text-muted">
            {isCustomized ? "متصل بالباك إند" : "جاري الاتصال"} · {storageKb} KB
          </span>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="استيراد قائمة جاهزة" icon={<Upload className="h-4 w-4" />}>
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            اختار ملف JSON صدرته قبل كده وهيحلّ محل بيانات الموقع على السيرفر فوراً.
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
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
              <Button size="sm" onClick={() => {
                const result = importJson(paste);
                show(result.ok ? "تم الاستيراد ✅" : result.error ?? "خطأ", result.ok ? "success" : "error");
                if (result.ok) setPaste("");
              }}>
                استيراد
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPaste("")}>
                تفريغ
              </Button>
            </div>
          </details>
        </Panel>

        <Panel title="حماية لوحة التحكم" description="جلسة آمنة ومحمية من السيرفر" icon={<Lock className="h-4 w-4" />}>
          <div className="space-y-3">
            <Toggle
              label="طلب رقم سري قبل فتح اللوحة"
              description="لو اطفيته أي حد عنده اللينك يقدر يعدّل — مفيد وقت التطوير بس"
              checked={admin.lockAdmin}
              onChange={(checked) => {
                patchAdmin({ lockAdmin: checked });
                show(checked ? "اللوحة اتقفلت بالرقم السري" : "اللوحة بقت مفتوحة لأي حد عنده اللينك");
              }}
            />
            <Field label="الرقم السري" hint="٤ أرقام أو أكتر — بيتحفظ في متصفح الجهاز بس">
              <div className="flex items-center gap-2">
                <TextInput
                  type={showPin ? "text" : "password"}
                  value={admin.pin}
                  onChange={(event) => patchAdmin({ pin: event.target.value })}
                  inputMode="numeric"
                />
                <Button size="sm" variant="ghost" onClick={() => setShowPin((s) => !s)}>
                  {showPin ? "إخفاء" : "إظهار"}
                </Button>
              </div>
            </Field>
            <p className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 p-2.5 text-[11px] leading-relaxed text-amber-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              تسجيل الدخول محمي من الباك إند بجلسة HttpOnly. استخدم رقماً قوياً وحدد SESSION_SECRET في الإنتاج.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="رابط القائمة وكود QR" description="اطبعه وحطه على الطرابيزات أو على استيكر الدليفري" icon={<QrCode className="h-4 w-4" />}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-56 flex-1 space-y-2">
            <TextInput readOnly value={menuUrl} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(menuUrl, "لينك القائمة اتنسخ")}>
                <Link2 className="h-3.5 w-3.5" /> نسخ اللينك
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
              الكود بيتولّد من خدمة صورة عامة (qrserver.com) وقت العرض — مفيش أي باك إند في المشروع.
              بعد الديبلوي غيّر الدومين في المتصفح وهييتولد كود جديد تلقائياً.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR code للقائمة"
            className="h-28 w-28 rounded-xl border border-line bg-white p-1.5"
          />
        </div>
      </Panel>

      <Panel title="منطقة الخطر" description="إعادة بيانات الموقع على السيرفر للوضع الافتراضي" icon={<RefreshCw className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center gap-2">
          {confirmReset ? (
            <>
              <span className="text-xs font-bold text-red-400">متأكد؟ بيانات الموقع الحالية على السيرفر هتتمسح.</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  resetToDefaults();
                  setConfirmReset(false);
                  show("رجّعنا كل حاجة للوضع الافتراضي");
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
            {isCustomized ? `آخر تحديث: ${new Date(data.updatedAt).toLocaleString("ar-EG")}` : "لسه ما اتعدّلش حاجة على الجهاز ده"}
          </span>
        </div>
      </Panel>

      {toast ? <Toast message={toast.text} tone={toast.tone} /> : null}
    </div>
  );
}
