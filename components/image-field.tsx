"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, LoaderCircle, Trash2, Upload } from "lucide-react";
import { fileToOptimizedDataUrl, MAX_UPLOAD_KB } from "@/lib/image";
import { Button, Field } from "./ui";

/**
 * حقل صورة يقبل رابط أو رفع من الجهاز (الصورة بتتضغط وتتحول dataURL
 * وتتخزن في localStorage — من غير أي سيرفر).
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

  const onPick = async (file?: File) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const { dataUrl, kb } = await fileToOptimizedDataUrl(file, { maxSize: 1000 });
      if (kb > MAX_UPLOAD_KB) {
        setError(`الصورة لسه تقيلة (${kb}KB) — قلّل الدقة أو اختار صورة أصغر`);
      }
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصلت مشكلة في الصورة");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

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
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPick(event.target.files?.[0])}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> رفع صورة
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="danger" onClick={() => onChange("")}>
                <Trash2 className="h-3.5 w-3.5" /> مسح
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
            <input
              value={value.startsWith("data:") ? "" : value}
              placeholder={value.startsWith("data:") ? "صورة مرفوعة من الجهاز" : "https://…"}
              onChange={(event) => onChange(event.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
            />
          </div>
          {error ? <p className="text-[11px] font-semibold text-red-400">{error}</p> : null}
        </div>
      </div>
    </Field>
  );
}
