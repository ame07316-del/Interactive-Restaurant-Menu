"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Cloud, HardDrive, ImagePlus, Link2, LoaderCircle, Trash2, Upload } from "lucide-react";
import { MAX_UPLOAD_KB, optimizeImage } from "@/lib/image";
import { AUTH_SERVER_STATE, getAuthSnapshot, subscribeAuth } from "@/lib/supabase-auth-core";
import { uploadMenuImage } from "@/lib/supabase-menu";
import { Button, Field } from "./ui";

/**
 * حقل صورة يقبل رابط أو رفع من الجهاز.
 * لو Supabase متظبط وانت مسجّل دخول → الصورة بتترفع على باكت menu-images
 * وبيتخزن الـ public URL. لو الرفع فشل أو النت مقطوع → بترجع dataURL محلي (fallback).
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  aspect = "aspect-[4/3]",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => AUTH_SERVER_STATE);
  const cloudReady = auth.enabled && Boolean(auth.userId);

  const onPick = async (file?: File) => {
    if (!file) return;
    setError("");
    setNote("");
    setBusy(true);
    try {
      // الصور اللي رايحة السحابة ممكن تبقى أكبر شوية — التخزين مش localStorage
      const optimized = await optimizeImage(file, { maxSize: cloudReady ? 1400 : 1000 });

      if (cloudReady && optimized.blob) {
        const result = await uploadMenuImage(optimized.blob, optimized.extension);
        if (result.ok && result.value) {
          onChange(result.value);
          setNote(`اترفعت على menu-images · ${optimized.kb}KB`);
          return;
        }
        // الرفع فشل → بنكمّل بالـ dataURL بدل ما المستخدم يضيع تعبه
        setError(`الرفع للسحابة فشل (${result.error ?? "خطأ"}) — اتخزنت محلياً كصورة مؤقتة`);
      }

      if (optimized.storageKb > MAX_UPLOAD_KB) {
        setError(`الصورة لسه تقيلة (${optimized.storageKb}KB) — قلّل الدقة أو اختار صورة أصغر`);
      }
      onChange(optimized.dataUrl);
      if (!cloudReady) setNote(`اتخزنت في المتصفح · ${optimized.storageKb}KB`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصلت مشكلة في الصورة");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isDataUrl = value.startsWith("data:");

  return (
    <Field label={label} hint={hint ?? "ارفع صورة من الموبايل أو احط رابط مباشر (jpg / png / webp)"}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          className={`relative w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2 sm:w-40 ${aspect}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 grid place-items-center bg-black/55 text-white">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPick(event.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> {cloudReady ? "رفع صورة للسحابة" : "رفع صورة"}
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="danger" onClick={() => onChange("")}>
                <Trash2 className="h-3.5 w-3.5" /> مسح
              </Button>
            ) : null}
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-muted"
              title={
                cloudReady
                  ? "الصور بتترفع على Supabase Storage وبتتشاف من كل الأجهزة"
                  : "الصور بتتخزن في متصفحك بس — سجّل دخول عشان ترفعها للسحابة"
              }
            >
              {cloudReady ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
              {cloudReady ? "menu-images" : "تخزين محلي"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
            <input
              value={isDataUrl ? "" : value}
              placeholder={isDataUrl ? "صورة مرفوعة من الجهاز" : "https://…"}
              onChange={(event) => onChange(event.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
          </div>
          {error ? <p className="text-[11px] font-semibold text-red-400">{error}</p> : null}
          {note && !error ? <p className="text-[11px] font-semibold text-emerald-400">{note}</p> : null}
        </div>
      </div>
    </Field>
  );
}
