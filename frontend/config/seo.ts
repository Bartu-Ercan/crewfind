const fallbackSiteUrl = "https://crewfind-tr.vercel.app";
import type { Metadata } from "next";
import type { GameId } from "@/shared/game-config";

function normalizeSiteUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return fallbackSiteUrl;

  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL,
);

export const siteName = "CrewFind";

export const seo = {
  title: "CrewFind - VALORANT Takım Arkadaşı Bul",
  englishTitle: "CrewFind - VALORANT Team Finder",
  description:
    "CrewFind ile VALORANT için rankına uygun takım arkadaşları bul, eksik oyuncunu saniyeler içinde tamamla ve özel lobide buluş.",
  englishDescription:
    "Find VALORANT teammates by rank, complete your squad in seconds, and meet your matched players in a private lobby with CrewFind.",
  keywords: [
    "CrewFind",
    "VALORANT takım bulma",
    "VALORANT takım arkadaşı",
    "VALORANT ekip bul",
    "VALORANT oyuncu bul",
    "VALORANT duo bul",
    "VALORANT 5 stack",
    "VALORANT team finder",
    "find VALORANT teammates",
    "VALORANT LFG",
    "VALORANT squad finder",
    "ranked VALORANT teammates",
  ],
};

export const gameSeo: Record<GameId, typeof seo> = {
  valorant: seo,
  "league-of-legends": {
    title: "CrewFind - League of Legends Takım Arkadaşı Bul",
    englishTitle: "CrewFind - League of Legends Team Finder",
    description: "CrewFind ile League of Legends için sunucu, sıra, rank ve rollere uygun takım arkadaşları bul.",
    englishDescription: "Find League of Legends teammates by server, queue, rank, and role with CrewFind.",
    keywords: ["CrewFind", "LoL takım bulma", "League of Legends takım arkadaşı", "LoL duo bul", "LoL LFG", "League of Legends team finder"],
  },
  cs2: {
    title: "CrewFind - Counter-Strike 2 Takım Arkadaşı Bul",
    englishTitle: "CrewFind - Counter-Strike 2 Team Finder",
    description: "CrewFind ile CS2 Premier veya Competitive için rating, bağlantı bölgesi ve haritalara uygun takım arkadaşları bul.",
    englishDescription: "Find CS2 Premier or Competitive teammates by rating, region, and map with CrewFind.",
    keywords: ["CrewFind", "CS2 takım bulma", "Counter-Strike 2 takım arkadaşı", "CS2 Premier takım", "CS2 LFG", "CS2 team finder"],
  },
};

export function canonicalUrlFor(path: string) {
  return new URL(path, siteUrl).toString();
}

export function metadataFor(game: GameId, path: string): Metadata {
  const value = gameSeo[game];
  const canonical = canonicalUrlFor(path);
  return {
    title: value.title,
    description: value.description,
    keywords: value.keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName,
      title: value.title,
      description: `${value.description} ${value.englishDescription}`,
      locale: "tr_TR",
      alternateLocale: ["en_US"],
    },
    twitter: { card: "summary", title: value.englishTitle, description: value.englishDescription },
  };
}

export function jsonLdFor(game: GameId, path: string) {
  const value = gameSeo[game];
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    alternateName: [value.englishTitle, `${GAME_LABELS[game]} takım bulma`, `${GAME_LABELS[game]} team finder`],
    url: canonicalUrlFor(path),
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    inLanguage: ["tr-TR", "en-US"],
    description: `${value.description} ${value.englishDescription}`,
    keywords: value.keywords.join(", "),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    audience: { "@type": "Audience", audienceType: `${GAME_LABELS[game]} players` },
  };
}

const GAME_LABELS: Record<GameId, string> = {
  valorant: "VALORANT",
  "league-of-legends": "League of Legends",
  cs2: "Counter-Strike 2",
};

export const canonicalUrl = canonicalUrlFor("/valorant");

export const bilingualDescription = `${seo.description} ${seo.englishDescription}`;
