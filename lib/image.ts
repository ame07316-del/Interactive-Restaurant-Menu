/**
 * ضغط الصور في المتصفح قبل رفعها على Supabase Storage أو تخزينها كـ dataURL
 * في localStorage (حدود التخزين ≈5MB).
 */
export interface ImageOptions {
  maxSize?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp" | "image/png";
}

export interface OptimizedImage {
  dataUrl: string;
  blob: Blob | null;
  /** الحجم الحقيقي للملف بعد الضغط (تقريبي) */
  kb: number;
  /** المساحة اللي هياخدها الـ dataURL في localStorage (UTF-16) */
  storageKb: number;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
}

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function optimizeImage(
  file: File,
  { maxSize = 900, quality = 0.82, mimeType = "image/webp" }: ImageOptions = {},
): Promise<OptimizedImage> {
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
  const blob = await new Promise<Blob | null>((resolve) => {
    if (typeof canvas.toBlob !== "function") return resolve(null);
    canvas.toBlob((value) => resolve(value), mimeType, quality);
  });

  return {
    dataUrl,
    blob,
    kb: Math.round((dataUrl.length / 1024) * 0.75),
    storageKb: Math.round((dataUrl.length / 1024) * 2),
    width,
    height,
    mimeType,
    extension: EXTENSIONS[mimeType] ?? "webp",
  };
}

/** نسخة قديمة محتفظ بيها للتوافق — بترجّع dataURL فقط */
export async function fileToOptimizedDataUrl(
  file: File,
  options: ImageOptions = {},
): Promise<{ dataUrl: string; kb: number; width: number; height: number }> {
  const { dataUrl, storageKb, width, height } = await optimizeImage(file, options);
  return { dataUrl, kb: storageKb, width, height };
}

export const MAX_UPLOAD_KB = 400;
