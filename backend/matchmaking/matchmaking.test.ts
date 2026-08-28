import { describe, expect, it } from "vitest";
import { entriesAreCompatible, findBestFive, type MatchEntry } from "./matchmaking";

const entry = (
  id: string,
  partySize: number,
  rank = 10,
  createdAt = 1,
): MatchEntry => ({
  id,
  game: "valorant",
  rankSystem: "valorant",
  partySize,
  targetSize: 5,
  rank,
  minRank: 8,
  maxRank: 12,
  servers: ["frankfurt"],
  queueTypes: ["competitive"],
  roles: [],
  maps: [],
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

  it("beş solo oyuncuyu beş kişilik lobide birleştirir", () => {
    const result = findBestFive([
      entry("solo-1", 1, 10, 1),
      entry("solo-2", 1, 10, 2),
      entry("solo-3", 1, 10, 3),
      entry("solo-4", 1, 10, 4),
      entry("solo-5", 1, 10, 5),
    ]);

    expect(result).toHaveLength(5);
    expect(result?.reduce((total, item) => total + item.partySize, 0)).toBe(5);
  });

  it("üç kişilik grubu iki soloyla beş kişiye tamamlar", () => {
    const result = findBestFive([
      entry("group-of-three", 3, 10, 1),
      entry("solo-1", 1, 10, 2),
      entry("solo-2", 1, 10, 3),
    ]);

    expect(result?.map((item) => item.id)).toEqual([
      "group-of-three",
      "solo-1",
      "solo-2",
    ]);
    expect(result?.reduce((total, item) => total + item.partySize, 0)).toBe(5);
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

  it("farklı oyunları ve rank sistemlerini ayırır", () => {
    expect(entriesAreCompatible(entry("valorant", 1), {
      ...entry("lol", 1),
      game: "league-of-legends",
      rankSystem: "lol-solo",
      servers: ["tr1"],
      queueTypes: ["solo-duo"],
      roles: ["mid"],
    })).toBe(false);
    expect(entriesAreCompatible({ ...entry("solo", 1), game: "league-of-legends", rankSystem: "lol-solo", servers: ["tr1"], queueTypes: ["solo-duo"], roles: ["mid"] }, {
      ...entry("flex", 1),
      game: "league-of-legends",
      rankSystem: "lol-flex",
      servers: ["tr1"],
      queueTypes: ["flex"],
      roles: ["top"],
    })).toBe(false);
  });

  it("LoL rol çakışmasını reddeder ve beş benzersiz rolü eşleştirir", () => {
    const lolEntry = (id: string, role: string): MatchEntry => ({
      ...entry(id, 1),
      game: "league-of-legends",
      rankSystem: "lol-solo",
      servers: ["tr1"],
      queueTypes: ["solo-duo"],
      roles: [role],
    });
    expect(entriesAreCompatible(lolEntry("a", "mid"), lolEntry("b", "mid"))).toBe(false);
    expect(findBestFive([
      lolEntry("top", "top"),
      lolEntry("jungle", "jungle"),
      lolEntry("mid", "mid"),
      lolEntry("bottom", "bottom"),
      lolEntry("support", "support"),
    ])).toHaveLength(5);
  });

  it("CS2 Competitive için ortak harita ister", () => {
    const competitive = (id: string, maps: string[]): MatchEntry => ({
      ...entry(id, 1),
      game: "cs2",
      rankSystem: "cs2-competitive",
      servers: ["vienna"],
      queueTypes: ["competitive"],
      maps,
    });
    expect(entriesAreCompatible(competitive("a", ["mirage"]), competitive("b", ["nuke"]))).toBe(false);
    expect(entriesAreCompatible(competitive("a", ["mirage", "nuke"]), competitive("b", ["nuke"]))).toBe(true);
  });

  it("LoL TR ile EUW ve Solo/Duo ile Flex kuyruklarını ayırır", () => {
    const lol = (id: string): MatchEntry => ({
      ...entry(id, 1),
      game: "league-of-legends",
      rankSystem: "lol-solo",
      servers: ["tr1"],
      queueTypes: ["solo-duo"],
      roles: [id === "a" ? "top" : "mid"],
    });
    expect(entriesAreCompatible(lol("a"), { ...lol("b"), servers: ["euw1"] })).toBe(false);
    expect(entriesAreCompatible(lol("a"), {
      ...lol("b"),
      rankSystem: "lol-flex",
      queueTypes: ["flex"],
    })).toBe(false);
  });

  it("CS2 Premier ile Competitive kuyruklarını ayırır", () => {
    const premier: MatchEntry = {
      ...entry("premier", 1),
      game: "cs2",
      rankSystem: "cs2-premier",
      rank: 10_000,
      minRank: 5_000,
      maxRank: 15_000,
      servers: ["vienna"],
      queueTypes: ["premier"],
    };
    const competitive: MatchEntry = {
      ...entry("competitive", 1),
      game: "cs2",
      rankSystem: "cs2-competitive",
      servers: ["vienna"],
      queueTypes: ["competitive"],
      maps: ["mirage"],
    };
    expect(entriesAreCompatible(premier, competitive)).toBe(false);
  });

  it("beş soloyu üç oyunda da doğru bağlamla eşleştirir", () => {
    const games: MatchEntry[][] = [
      Array.from({ length: 5 }, (_, index) => entry(`valorant-${index}`, 1, 10, index)),
      ["top", "jungle", "mid", "bottom", "support"].map((role, index) => ({
        ...entry(`lol-${index}`, 1, 12, index),
        game: "league-of-legends" as const,
        rankSystem: "lol-solo",
        servers: ["tr1"],
        queueTypes: ["solo-duo"],
        roles: [role],
      })),
      Array.from({ length: 5 }, (_, index) => ({
        ...entry(`cs2-${index}`, 1, 10_000, index),
        game: "cs2" as const,
        rankSystem: "cs2-premier",
        minRank: 5_000,
        maxRank: 15_000,
        servers: ["vienna"],
        queueTypes: ["premier"],
      })),
    ];
    for (const candidates of games) {
      expect(findBestFive(candidates)?.reduce((sum, item) => sum + item.partySize, 0)).toBe(5);
    }
  });
});
