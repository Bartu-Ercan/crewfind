import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { GameSeoContent } from "@/frontend/components/game-seo-content";
import { jsonLdFor, metadataFor, serializeJsonLd } from "@/frontend/config/seo";

export const metadata = metadataFor("cs2", "/cs2");
const jsonLd = jsonLdFor("cs2", "/cs2");

export default function Cs2Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <CrewFindApp game="cs2">
        <GameSeoContent game="cs2" />
      </CrewFindApp>
    </>
  );
}
