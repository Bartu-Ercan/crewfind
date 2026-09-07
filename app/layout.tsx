import type { Metadata } from "next";
import { Hanken_Grotesk, Rajdhani } from "next/font/google";
import { canonicalUrl, seo, siteName, siteUrl, socialImage } from "@/frontend/config/seo";
import { AccountProvider } from "@/frontend/components/account-provider";
import { GuestImportDialog } from "@/frontend/components/guest-import-dialog";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${seo.title} | ${siteName}`,
    template: `%s | ${siteName}`,
  },
  description: seo.description,
  keywords: seo.keywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  verification: {
    google: "CEQQnE5sTtTH7vaTckJfA9UBa1QzwItqSPdWiMZIVXo",
  },
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    siteName,
    title: `${seo.title} | ${siteName}`,
    description: seo.description,
    locale: "tr_TR",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${seo.title} | ${siteName}`,
    description: seo.description,
    images: [socialImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "gaming",
  other: {
    "content-language": "tr-TR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${rajdhani.variable} ${hanken.variable}`}><AccountProvider>{children}<GuestImportDialog /></AccountProvider></body>
    </html>
  );
}
