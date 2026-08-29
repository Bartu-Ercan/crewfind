import { describe, expect, it } from "vitest";
import { normalizeLolProfile } from "./profile";

describe("normalizeLolProfile", () => {
  it("keeps only the compact profile fields used by CrewFind", () => {
    const profile = normalizeLolProfile({
      status: "success",
      data: {
        name: "Oyuncu#TR1",
        region: "tr",
        rank: { tier: "Gold IV", lp: "42 LP" },
        match_history: [
          { champion: "Ahri", result: "Victory", kda: "8/2/7", type: "Soloqueue", duration: "28min" },
        ],
        ignored: "value",
      },
    }, "2026-08-29T10:00:00.000Z");

    expect(profile).toEqual({
      riotId: "Oyuncu#TR1",
      region: "tr",
      rank: { tier: "Gold IV", lp: "42 LP" },
      recentMatches: [
        { champion: "Ahri", result: "Victory", kda: "8/2/7", queue: "Soloqueue", duration: "28min" },
      ],
      source: "LeagueOfGraphs",
      fetchedAt: "2026-08-29T10:00:00.000Z",
    });
  });

  it("rejects malformed provider responses", () => {
    expect(normalizeLolProfile({ status: "success", data: {} })).toBeNull();
    expect(normalizeLolProfile({ error: "not found" })).toBeNull();
  });
});
