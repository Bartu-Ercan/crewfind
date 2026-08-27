import { describe, expect, it } from "vitest";
import { entriesAreCompatible, findBestFive, type MatchEntry } from "./matchmaking";

const entry = (
  id: string,
  partySize: number,
  rank = 10,
  createdAt = 1,
): MatchEntry => ({
  id,
  partySize,
  targetSize: 5,
  rank,
  minRank: 8,
  maxRank: 12,
  server: "frankfurt",
  queueType: "competitive",
  createdAt,
});

describe("matchmaking", () => {
  it("rank aralıklarını iki yönlü kontrol eder", () => {
    const a = entry("a", 1, 10);
    const b = { ...entry("b", 1, 14), minRank: 9, maxRank: 15 };
    expect(entriesAreCompatible(a, b)).toBe(false);
  });

  it("yalnızca aynı sunucu ve kuyruktaki oyuncuları eşleştirir", () => {
    expect(entriesAreCompatible(entry("frankfurt", 1), { ...entry("istanbul", 1), server: "istanbul" })).toBe(false);
    expect(entriesAreCompatible(entry("competitive", 1), { ...entry("unrated", 1), queueType: "unrated" })).toBe(false);
  });

  it("duo aramasını tam takım aramasından ayırır", () => {
    const duo = { ...entry("duo", 1), targetSize: 2 };
    const fullTeam = entry("full-team", 1);
    expect(entriesAreCompatible(duo, fullTeam)).toBe(false);
    expect(findBestFive([duo, { ...entry("partner", 1), targetSize: 2 }])?.map((x) => x.id)).toEqual([
      "duo",
      "partner",
    ]);
  });

  it("üç ve dört kişilik ara hedefleri ayrı eşleştirir", () => {
    const trioTarget = { ...entry("trio-target", 1), targetSize: 3 };
    const quartetTarget = { ...entry("quartet-target", 1), targetSize: 4 };

    expect(entriesAreCompatible(trioTarget, quartetTarget)).toBe(false);
    expect(
      findBestFive([
        trioTarget,
        { ...entry("trio-partner", 2), targetSize: 3 },
      ])?.map((x) => x.id),
    ).toEqual(["trio-partner", "trio-target"]);
  });

  it("4 kişilik takımı soloyla tamamlar", () => {
    expect(findBestFive([entry("solo", 1), entry("team", 4)])?.map((x) => x.id)).toEqual([
      "team",
      "solo",
    ]);
  });

  it("mevcut takımı beş solodan önce tamamlar", () => {
    const result = findBestFive([
      entry("s1", 1, 10, 1),
      entry("s2", 1, 10, 2),
      entry("s3", 1, 10, 3),
      entry("s4", 1, 10, 4),
      entry("s5", 1, 10, 5),
      entry("group", 3, 10, 6),
    ]);
    expect(result?.some((x) => x.id === "group")).toBe(true);
  });
});
