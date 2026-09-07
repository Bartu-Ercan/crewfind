import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { GameSeoContent } from "@/frontend/components/game-seo-content";
import { jsonLdFor, metadataFor, serializeJsonLd } from "@/frontend/config/seo";

export const metadata = metadataFor("league-of-legends", "/league-of-legends");
const jsonLd = jsonLdFor("league-of-legends", "/league-of-legends");

export default function LeagueOfLegendsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <CrewFindApp game="league-of-legends">
        <GameSeoContent game="league-of-legends" />
      </CrewFindApp>
    </>
  );
}
