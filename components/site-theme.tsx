"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMenu } from "@/lib/use-menu";
import { pick } from "@/lib/format";

const HEX = /^#?([0-9a-f]{6})$/i;

function readableOn(hex: string): "#0b0b0d" | "#ffffff" {
  const match = HEX.exec(hex.trim());
  if (!match) return "#0b0b0d";
  const int = parseInt(match[1], 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#0b0b0d" : "#ffffff";
}

/**
 * يترجم إعدادات الأدمين لـ CSS variables على مستوى الصفحة —
 * علشان لون البراند والحواف والوضع الليلي يطلعوا على الموقع كله فوراً.
 */
export function SiteTheme() {
  const { data, ready } = useMenu();
  const pathname = usePathname();
  const { brand } = data;

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.style.setProperty("--accent", brand.accent);
    root.style.setProperty("--accent-contrast", readableOn(brand.accent));
    root.style.setProperty("--radius", `${brand.radius}px`);
    root.dataset.theme = brand.theme;
    root.dataset.font = brand.font || "cairo";
    root.lang = brand.language;
    root.dir = brand.language === "en" ? "ltr" : "rtl";

    const name = pick(brand.language, brand.restaurantName, brand.restaurantNameEn) || "Restaurant Menu";
    const isAdmin = pathname?.startsWith("/admin");
    document.title = isAdmin
      ? `لوحة التحكم — ${name}`
      : `${name} — ${pick(brand.language, brand.tagline, brand.taglineEn)}`;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", brand.accent);
  }, [ready, brand, pathname]);

  return null;
}
