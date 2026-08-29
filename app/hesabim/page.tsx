import type { Metadata } from "next";
import { AccountPage } from "@/frontend/components/account-page";
import { canonicalUrlFor } from "@/frontend/config/seo";

export const metadata: Metadata = {
  title: "Hesabım",
  description: "CrewFind hesabını ve kayıtlı Riot profillerini yönet.",
  alternates: { canonical: canonicalUrlFor("/hesabim") },
  robots: { index: false, follow: false },
};

export default function Page() { return <AccountPage />; }
