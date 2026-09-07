import type { Metadata } from "next";
import { AdminPage } from "@/frontend/components/admin-page";

export const metadata: Metadata = {
  title: "Yönetim",
  description: "CrewFind özel yönetim alanı.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin" },
};

export default function Page() { return <AdminPage />; }
