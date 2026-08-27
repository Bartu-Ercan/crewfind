import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { bilingualDescription, canonicalUrl, seo, siteName } from "@/frontend/config/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  alternateName: [seo.englishTitle, "VALORANT takım bulma", "VALORANT team finder"],
  url: canonicalUrl,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  inLanguage: ["tr-TR", "en-US"],
  description: bilingualDescription,
  keywords: seo.keywords.join(", "),
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  audience: {
    "@type": "Audience",
    audienceType: "VALORANT players",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CrewFindApp />
    </>
  );
}
