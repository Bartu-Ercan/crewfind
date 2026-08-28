import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { jsonLdFor, metadataFor } from "@/frontend/config/seo";

export const metadata = metadataFor("valorant", "/valorant");
const jsonLd = jsonLdFor("valorant", "/valorant");

export default function ValorantPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CrewFindApp game="valorant" />
    </>
  );
}
