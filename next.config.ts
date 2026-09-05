import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // يسمح لبروكسي المعاينة (منصات الاستضافة المؤقتة) بالوصول لسيرفر التطوير
  allowedDevOrigins: ["*.e2b.app", "*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
