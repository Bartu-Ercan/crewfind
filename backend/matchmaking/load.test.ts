import { describe, expect, it } from "vitest";
import { findBestFive, type MatchEntry } from "./matchmaking";

const roles = ["top", "jungle", "mid", "bottom", "support"];

function loadEntry(index: number): MatchEntry {
  const common = {
    id: `load-${index}`,
    partySize: 1,
    targetSize: 5,
    createdAt: index,
    roles: [] as string[],
    maps: [] as string[],
  };

  if (index < 100) {
    return {
      ...common,
      game: "valorant",
      rankSystem: "valorant",
      rank: 10,
      minRank: 6,
      maxRank: 24,
      servers: ["istanbul", "frankfurt"],
      queueTypes: ["competitive"],
    };
  }

  if (index < 175) {
    return {
      ...common,
      game: "league-of-legends",
      rankSystem: "lol-flex",
      rank: 12,
      minRank: 8,
      maxRank: 30,
      servers: ["tr1"],
      queueTypes: ["flex"],
      roles: [roles[(index - 100) % roles.length]],
    };
  }

  return {
    ...common,
    game: "cs2",
    rankSystem: "cs2-premier",
    rank: 9_500,
    minRank: 5_000,
    maxRank: 50_000,
    servers: ["vienna", "frankfurt"],
    queueTypes: ["premier"],
  };
}

describe("controlled matchmaking load", () => {
  it("250 karışık adayı oyunları karıştırmadan 50 tam takıma ayırır", () => {
    let remaining = Array.from({ length: 250 }, (_, index) => loadEntry(index));
    const matchedIds = new Set<string>();
    const gameCounts = new Map<MatchEntry["game"], number>();
    const startedAt = performance.now();

    while (remaining.length > 0) {
      const match = findBestFive(remaining);
      expect(match).not.toBeNull();

      const entries = match ?? [];
      const games = new Set(entries.map((entry) => entry.game));
      const rankSystems = new Set(entries.map((entry) => entry.rankSystem));
      const ids = new Set(entries.map((entry) => entry.id));

      expect(entries.reduce((total, entry) => total + entry.partySize, 0)).toBe(5);
      expect(games.size).toBe(1);
      expect(rankSystems.size).toBe(1);
      expect(ids.size).toBe(entries.length);

      for (const entry of entries) {
        expect(matchedIds.has(entry.id)).toBe(false);
        matchedIds.add(entry.id);
      }

      const game = entries[0].game;
      gameCounts.set(game, (gameCounts.get(game) ?? 0) + 1);
      remaining = remaining.filter((entry) => !ids.has(entry.id));
    }

    const durationMs = performance.now() - startedAt;
    expect(matchedIds.size).toBe(250);
    expect(gameCounts).toEqual(new Map([
      ["valorant", 20],
      ["league-of-legends", 15],
      ["cs2", 15],
    ]));
    expect(durationMs).toBeLessThan(1_000);
  });
});
