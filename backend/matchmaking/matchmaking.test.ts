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
  servers: ["frankfurt"],
  queueTypes: ["competitive"],
  createdAt,
});

describe("matchmaking", () => {
  it("rank aralıklarını iki yönlü kontrol eder", () => {
    const a = entry("a", 1, 10);
    const b = { ...entry("b", 1, 14), minRank: 9, maxRank: 15 };
    expect(entriesAreCompatible(a, b)).toBe(false);
  });

  it("yalnızca aynı sunucu ve kuyruktaki oyuncuları eşleştirir", () => {
    expect(
      entriesAreCompatible(entry("frankfurt", 1), {
        ...entry("istanbul", 1),
        servers: ["istanbul"],
      }),
    ).toBe(false);
    expect(
      entriesAreCompatible(entry("competitive", 1), {
        ...entry("unrated", 1),
        queueTypes: ["unrated"],
      }),
    ).toBe(false);
  });

  it("ortak seçenek içeren çoklu filtreleri eşleştirir", () => {
    const flexible = {
      ...entry("flexible", 1),
      servers: ["istanbul", "frankfurt"],
      queueTypes: ["competitive", "unrated"],
    };
    const istanbul = { ...entry("istanbul", 4), servers: ["istanbul"] };

    expect(entriesAreCompatible(flexible, istanbul)).toBe(true);
    expect(findBestFive([flexible, istanbul])?.map((item) => item.id)).toEqual([
      "istanbul",
      "flexible",
    ]);
  });

  it("grubun tamamında ortak sunucu yoksa eşleştirme yapmaz", () => {
    const flexible = {
      ...entry("flexible", 1),
      targetSize: 3,
      servers: ["istanbul", "frankfurt"],
    };
    const istanbul = { ...entry("istanbul", 1), targetSize: 3, servers: ["istanbul"] };
    const frankfurt = { ...entry("frankfurt", 1), targetSize: 3, servers: ["frankfurt"] };

    expect(findBestFive([flexible, istanbul, frankfurt])).toBeNull();
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
