import type { Metadata } from "next";
import { Hanken_Grotesk, Rajdhani } from "next/font/google";
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
  title: "CrewFind - Takımını tamamla",
  description: "VALORANT için hızlı ve sade takım arkadaşı eşleştirmesi.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${rajdhani.variable} ${hanken.variable}`}>{children}</body>
    </html>
  );
}
