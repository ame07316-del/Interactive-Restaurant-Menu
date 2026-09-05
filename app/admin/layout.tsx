import type { Metadata } from "next";

export const metadata: Metadata = {
  // اللوحة مخصوصة لأصحاب المطعم — متتفهرستش في جوجل
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
