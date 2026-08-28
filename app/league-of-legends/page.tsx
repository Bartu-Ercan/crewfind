import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { jsonLdFor, metadataFor } from "@/frontend/config/seo";

export const metadata = metadataFor("league-of-legends", "/league-of-legends");
const jsonLd = jsonLdFor("league-of-legends", "/league-of-legends");

export default function LeagueOfLegendsPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><CrewFindApp game="league-of-legends" /></>;
}
