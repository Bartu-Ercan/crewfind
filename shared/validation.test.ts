import { describe, expect, it } from "vitest";
import { CS2_MAPS, rankColorFor, rankSystemFor } from "./game-config";
import { createInitialSearchInput, searchSchema } from "./validation";

describe("oyun arama doğrulaması", () => {
  it("lobi rank rozeti için seçili kademenin rengini kullanır", () => {
    expect(rankColorFor("valorant", "competitive", 16)).toBe("#9451d6");
    expect(rankColorFor("league-of-legends", "solo-duo", 24)).toBe("#6e87d8");
    expect(rankColorFor("cs2", "premier", 9_500)).toBe("#657bd9");
  });

  it("Valorant varsayılanlarını geriye uyumlu tutar", () => {
    const input = { ...createInitialSearchInput("valorant"), displayName: "Oyuncu#TR1", contactValue: "Oyuncu#TR1" };
    expect(searchSchema.safeParse(input).success).toBe(true);
  });

  it("LoL grup büyüklüğü kadar benzersiz rol ister", () => {
    const input = {
      ...createInitialSearchInput("league-of-legends"),
      displayName: "Oyuncu#TR1",
      contactValue: "Oyuncu#TR1",
      rankSystem: "lol-flex",
      queueTypes: ["flex"],
      partySize: 2,
      targetSize: 5,
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

  it("CS2'de Steam adı veya arkadaş kodundan birini yeterli kabul eder", () => {
    const input = createInitialSearchInput("cs2");
    expect(searchSchema.safeParse({ ...input, displayName: "Steam Oyuncu" }).success).toBe(true);
    expect(searchSchema.safeParse({ ...input, contactValue: "12345678" }).success).toBe(true);
    expect(searchSchema.safeParse(input).success).toBe(false);
  });

  it("LoL Solo/Duo aramasını 1+1 olarak sabitler", () => {
    const input = { ...createInitialSearchInput("league-of-legends"), displayName: "Oyuncu#TR1", contactValue: "Oyuncu#TR1" };
    expect(searchSchema.safeParse(input).success).toBe(true);
    expect(searchSchema.safeParse({ ...input, targetSize: 5 }).success).toBe(false);
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
