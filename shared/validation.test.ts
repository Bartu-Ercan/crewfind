import { describe, expect, it } from "vitest";
import { CS2_MAPS, rankSystemFor } from "./game-config";
import { createInitialSearchInput, searchSchema } from "./validation";

describe("oyun arama doğrulaması", () => {
  it("Valorant varsayılanlarını geriye uyumlu tutar", () => {
    const input = { ...createInitialSearchInput("valorant"), displayName: "Oyuncu#TR1", contactValue: "Oyuncu#TR1" };
    expect(searchSchema.safeParse(input).success).toBe(true);
  });

  it("LoL grup büyüklüğü kadar benzersiz rol ister", () => {
    const input = {
      ...createInitialSearchInput("league-of-legends"),
      displayName: "Oyuncu#TR1",
      contactValue: "Oyuncu#TR1",
      partySize: 2,
      roles: ["mid", "mid"],
    };
    expect(searchSchema.safeParse(input).success).toBe(false);
    expect(searchSchema.safeParse({ ...input, roles: ["mid", "support"] }).success).toBe(true);
  });

  it("CS2 arkadaş kodunu 5–12 sayıyla sınırlar", () => {
    const input = { ...createInitialSearchInput("cs2"), displayName: "Steam Oyuncu", contactValue: "1234" };
    expect(searchSchema.safeParse(input).success).toBe(false);
    expect(searchSchema.safeParse({ ...input, contactValue: "12345678" }).success).toBe(true);
  });

  it("Competitive modunda en az bir harita ister", () => {
    const input = {
      ...createInitialSearchInput("cs2"),
      displayName: "Steam Oyuncu",
      contactValue: "12345678",
      rankSystem: rankSystemFor("cs2", "competitive"),
      queueTypes: ["competitive"],
      rank: 7,
      minRank: 4,
      maxRank: 17,
    };
    expect(searchSchema.safeParse(input).success).toBe(false);
    expect(searchSchema.safeParse({ ...input, maps: [CS2_MAPS[0].value] }).success).toBe(true);
  });
});
