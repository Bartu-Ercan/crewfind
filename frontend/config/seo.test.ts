import { describe, expect, it } from "vitest";
import { gameSeo, jsonLdFor, metadataFor, siteUrl } from "./seo";
import type { GameId } from "@/shared/game-config";

const productionOrigin = "https://crewfind.vercel.app";

const routes: Array<{ game: GameId; path: string }> = [
  { game: "valorant", path: "/valorant" },
  { game: "league-of-legends", path: "/league-of-legends" },
  { game: "cs2", path: "/cs2" },
];

function metadataTitle(game: GameId, path: string) {
  const title = metadataFor(game, path).title;
  expect(typeof title).toBe("string");
  return title as string;
}

describe("game SEO metadata", () => {
  it("uses the production CrewFind origin", () => {
    expect(siteUrl).toBe(productionOrigin);
  });

  it("keeps route titles distinct without repeating the CrewFind brand", () => {
    const titles = routes.map(({ game, path }) => metadataTitle(game, path));

    expect(new Set(titles).size).toBe(routes.length);
    for (const title of titles) {
      expect(title.trim()).not.toBe("");
      expect(title).not.toMatch(/CrewFind/i);
    }
  });

  it.each(routes)("keeps $game canonical, OpenGraph, and JSON-LD URLs aligned", ({ game, path }) => {
    const expectedUrl = `${productionOrigin}${path}`;
    const metadata = metadataFor(game, path);
    const jsonLd = jsonLdFor(game, path);
    const serialized = JSON.stringify({ metadata, jsonLd });

    expect(metadata.description).toBe(gameSeo[game].description);
    expect(metadata.alternates?.canonical).toBe(expectedUrl);
    expect(metadata.openGraph?.url).toBe(expectedUrl);
    expect(metadata.openGraph?.title).toBe(`${gameSeo[game].title} | CrewFind`);
    expect(((metadata.openGraph?.title as string).match(/CrewFind/gi) ?? []).length).toBe(1);
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: `${productionOrigin}/opengraph-image`, width: 1200, height: 630 })]);
    expect(metadata.twitter?.title).toBe(`${gameSeo[game].title} | CrewFind`);
    expect(jsonLd.url).toBe(expectedUrl);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("WebApplication");
    expect(JSON.parse(JSON.stringify(jsonLd))).toEqual(jsonLd);
    expect(new URL(expectedUrl).hostname).toBe("crewfind.vercel.app");
    expect(serialized).not.toContain("crewfind-tr.vercel.app");
    expect(serialized).not.toContain("crewfind.app");
  });
});
