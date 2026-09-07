import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { GameSeoContent } from "@/frontend/components/game-seo-content";
import { jsonLdFor, metadataFor, serializeJsonLd } from "@/frontend/config/seo";

export const metadata = metadataFor("valorant", "/valorant");
const jsonLd = jsonLdFor("valorant", "/valorant");

export default function ValorantPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <CrewFindApp game="valorant">
        <GameSeoContent game="valorant" />
      </CrewFindApp>
    </>
  );
}
