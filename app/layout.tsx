import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";

import { SiteTheme } from "@/components/site-theme";

const BOOTSTRAP_SCRIPT = `(function(){try{var raw=localStorage.getItem('royal-menu:data:v1');if(!raw)return;var d=JSON.parse(raw);var b=(d&&d.brand)||{};var root=document.documentElement;var accent=b.accent||'#f59e0b';function lum(hex){var m=/#?([0-9a-f]{6})/i.exec(hex||'');if(!m)return 1;var i=parseInt(m[1],16);var c=[(i>>16)&255,(i>>8)&255,i&255].map(function(v){v=v/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
root.style.setProperty('--accent',accent);root.style.setProperty('--accent-contrast',lum(accent)>0.45?'#0b0b0d':'#ffffff');root.style.setProperty('--radius',(b.radius||16)+'px');root.dataset.theme=b.theme||'dark';root.dataset.font=b.font||'cairo';root.dir=b.language==='en'?'ltr':'rtl';root.lang=b.language||'ar';}catch(e){}})();`;

export const metadata: Metadata = {
  title: "قائمة المطعم الذكية | اطلب على واتساب",
  description:
    "قائمة إلكترونية للمطعم مع سلة طلبات وإرسال مباشر على واتساب — تعمل بالكامل من المتصفح بدون سيرفر، ولوحة تحكم تتحكم في كل حاجة.",
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
        <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
        <SiteTheme />
        {children}
      </body>
    </html>
  );
}
