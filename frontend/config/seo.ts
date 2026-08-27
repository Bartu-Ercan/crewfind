const fallbackSiteUrl = "https://crewfind-tr.vercel.app";

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

export const canonicalUrl = new URL("/", siteUrl).toString();

export const bilingualDescription = `${seo.description} ${seo.englishDescription}`;
