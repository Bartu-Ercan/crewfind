import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

const productionOrigin = "https://crewfind.vercel.app";
const publicPaths = [
  "/valorant",
  "/league-of-legends",
  "/cs2",
  "/gizlilik",
  "/kullanim-kosullari",
];

function normalizedLastModified() {
  return sitemap().map(({ lastModified }) =>
    lastModified instanceof Date ? lastModified.toISOString() : lastModified,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("SEO route files", () => {
  it("points robots at the production host and sitemap", () => {
    const value = robots();

    expect(value.host).toBe(productionOrigin);
    expect(value.sitemap).toBe(`${productionOrigin}/sitemap.xml`);
  });

  it("lists only the exact public, canonical HTTPS routes", () => {
    const entries = sitemap();
    const urls = entries.map(({ url }) => url);

    expect(urls).toEqual(publicPaths.map((path) => `${productionOrigin}${path}`));
    expect(new Set(urls).size).toBe(publicPaths.length);

    for (const value of urls) {
      const url = new URL(value);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("crewfind.vercel.app");
      expect(url.pathname).not.toMatch(/^\/(?:hesabim|auth|api)(?:\/|$)/);
      expect(value).not.toContain("crewfind-tr.vercel.app");
      expect(value).not.toContain("crewfind.app");
    }
  });

  it("does not claim a new last-modified date just because the sitemap is generated again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const first = normalizedLastModified();

    vi.setSystemTime(new Date("2026-02-01T00:00:00.000Z"));
    const second = normalizedLastModified();

    expect(second).toEqual(first);
  });
});
