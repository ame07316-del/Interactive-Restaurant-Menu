export interface FontOption {
  key: string;
  label: string;
  stack: string;
}

/**
 * الخطوط بتتحمّل من Google Fonts عن طريق <link> في الـ head (شاهد الكود في app/layout.tsx)
 * — من غير أي اعتماد على next/font عشان البناء ما يتعطلش لو مفيش إنترنت.
 */
export const FONT_OPTIONS: FontOption[] = [
  {
    key: "cairo",
    label: "Cairo — عصري ومناسب للمنيو",
    stack: '"Cairo", ui-sans-serif, system-ui, "Segoe UI", sans-serif',
  },
  {
    key: "tajawal",
    label: "Tajawal — هادي ومقروء",
    stack: '"Tajawal", ui-sans-serif, system-ui, "Segoe UI", sans-serif',
  },
  {
    key: "almarai",
    label: "Almarai — بسيط ورسمي",
    stack: '"Almarai", ui-sans-serif, system-ui, "Segoe UI", sans-serif',
  },
  {
    key: "amiri",
    label: "Amiri — كلاسيكي (نسخي)",
    stack: '"Amiri", "Times New Roman", serif',
  },
  {
    key: "system",
    label: "خط النظام — أسرع تحميل",
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
];

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Cairo:wght@400;700;900&family=Tajawal:wght@400;500;700&family=Amiri:wght@400;700&display=swap";

export function fontStackFor(key: string): string {
  return FONT_OPTIONS.find((option) => option.key === key)?.stack ?? FONT_OPTIONS[0].stack;
}
