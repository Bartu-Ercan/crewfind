const fallbackSiteUrl = "https://crewfind.vercel.app";
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
  title: "VALORANT Takım Arkadaşı ve 5. Oyuncu Bul",
  description:
    "VALORANT takım arkadaşı bul. Rank, ortak sunucu ve sıra tercihine göre eşleş; eksik oyuncunu tamamlayıp özel lobide buluş.",
  keywords: [
    "CrewFind",
    "VALORANT takım bulma",
    "VALORANT takım arkadaşı",
    "VALORANT ekip bul",
    "VALORANT oyuncu bul",
    "VALORANT duo bul",
    "VALORANT 5. oyuncu bul",
  ],
};

export const gameSeo: Record<GameId, typeof seo> = {
  valorant: seo,
  "league-of-legends": {
    title: "LoL Duo ve Takım Arkadaşı Bul",
    description: "LoL takım arkadaşı bul. TR1 veya EUW1'de Solo/Duo ve Flex için rankına ve takım rollerine uygun oyuncularla eşleş.",
    keywords: ["CrewFind", "LoL takım bulma", "League of Legends takım arkadaşı", "LoL duo bul", "LoL Flex takım bulma", "LoL LFG"],
  },
  cs2: {
    title: "CS2 Takım Arkadaşı Bul",
    description: "CS2 takım arkadaşı bul. Premier veya Competitive için rating, bağlantı bölgesi ve ortak harita tercihlerine göre takımını tamamla.",
    keywords: ["CrewFind", "CS2 takım bulma", "Counter-Strike 2 takım arkadaşı", "CS2 Premier takım", "CS2 Competitive takım", "CS2 LFG"],
  },
};

export function canonicalUrlFor(path: string) {
  return new URL(path, siteUrl).toString();
}

export const socialImage = {
  url: canonicalUrlFor("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: "CrewFind ile VALORANT, League of Legends ve CS2 takım arkadaşı bul",
};

export function metadataFor(game: GameId, path: string): Metadata {
  const value = gameSeo[game];
  const canonical = canonicalUrlFor(path);
  const socialTitle = `${value.title} | ${siteName}`;
  return {
    title: value.title,
    description: value.description,
    keywords: value.keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName,
      title: socialTitle,
      description: value.description,
      locale: "tr_TR",
      images: [socialImage],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description: value.description, images: [socialImage.url] },
  };
}

export function jsonLdFor(game: GameId, path: string) {
  const value = gameSeo[game];
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    alternateName: [`${GAME_LABELS[game]} takım bulma`, `${GAME_LABELS[game]} takım arkadaşı bul`],
    url: canonicalUrlFor(path),
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    inLanguage: "tr-TR",
    description: value.description,
    keywords: value.keywords.join(", "),
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    audience: { "@type": "Audience", audienceType: `${GAME_LABELS[game]} players` },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const GAME_LABELS: Record<GameId, string> = {
  valorant: "VALORANT",
  "league-of-legends": "League of Legends",
  cs2: "Counter-Strike 2",
};

export const canonicalUrl = canonicalUrlFor("/valorant");
