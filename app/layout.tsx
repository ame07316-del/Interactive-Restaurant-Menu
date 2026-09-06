import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";

import { SiteTheme } from "@/components/site-theme";

export const metadata: Metadata = {
  title: "قائمة المطعم الذكية | اطلب على واتساب",
  description:
    "قائمة مطعم متكاملة مع مخزون وطلبات ولوحة تحكم آمنة متصلة بباك إند.",
  applicationName: "Smart Restaurant Menu",
  openGraph: {
    title: "قائمة المطعم الذكية",
    description: "اطلب بدقيقتين والطلب يوصلك على باب البيت 🍔",
    type: "website",
    locale: "ar_EG",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteTheme />
        {children}
      </body>
    </html>
  );
}
