import { CrewFindApp } from "@/frontend/components/crewfind-app";
import { jsonLdFor, metadataFor } from "@/frontend/config/seo";

export const metadata = metadataFor("cs2", "/cs2");
const jsonLd = jsonLdFor("cs2", "/cs2");

export default function Cs2Page() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><CrewFindApp game="cs2" /></>;
}
