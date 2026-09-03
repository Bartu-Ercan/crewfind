import type { Metadata } from "next";
import { canonicalUrlFor } from "@/frontend/config/seo";

export const metadata: Metadata = {
  title: "Hesap işlemi",
  alternates: { canonical: canonicalUrlFor("/auth/callback") },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
