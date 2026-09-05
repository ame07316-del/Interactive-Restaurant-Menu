/**
 * ضغط الصور في المتصفح قبل تخزينها في localStorage
 * عشان الصور المرفوعة متاكلش حدود التخزين (≈5MB).
 */
export interface ImageOptions {
  maxSize?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp" | "image/png";
}

export async function fileToOptimizedDataUrl(
  file: File,
  { maxSize = 900, quality = 0.82, mimeType = "image/webp" }: ImageOptions = {},
): Promise<{ dataUrl: string; kb: number; width: number; height: number }> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذّرت قراءة الملف"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("ملف الصورة غير صالح"));
    el.src = raw;
  });

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("المتصفح ما بيدعمش معالجة الصور");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(mimeType, quality);
  return { dataUrl, kb: Math.round((dataUrl.length / 1024) * 2), width, height };
}

export const MAX_UPLOAD_KB = 400;
