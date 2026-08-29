// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { readGuestAccounts, removeGuestAccounts, upsertGuestAccount } from "./guest-accounts";

const preference = {
  game: "valorant" as const,
  rankSystem: "valorant",
  rank: 8,
  minRank: 4,
  maxRank: 24,
  partySize: 1,
  targetSize: 5,
  servers: ["istanbul"],
  queueTypes: ["competitive"],
  roles: [],
  maps: [],
};

describe("guest Riot accounts", () => {
  beforeEach(() => localStorage.clear());

  it("upserts the same Riot ID case-insensitively per game", () => {
    upsertGuestAccount({ id: "one", riotId: "Bartu#TR1", game: "valorant", preference, updatedAt: "a" });
    upsertGuestAccount({ id: "two", riotId: "bartu#tr1", game: "valorant", preference, updatedAt: "b" });
    expect(readGuestAccounts()).toEqual([
      expect.objectContaining({ id: "two", riotId: "bartu#tr1", updatedAt: "b" }),
    ]);
  });

  it("removes only selected imports", () => {
    upsertGuestAccount({ id: "one", riotId: "One#TR1", game: "valorant", preference, updatedAt: "a" });
    upsertGuestAccount({ id: "two", riotId: "Two#TR1", game: "valorant", preference, updatedAt: "b" });
    removeGuestAccounts(["one"]);
    expect(readGuestAccounts().map((item) => item.id)).toEqual(["two"]);
  });

  it("updates a selected profile when its Riot ID changes", () => {
    upsertGuestAccount({ id: "saved", riotId: "First#TR1", game: "valorant", preference, updatedAt: "a" });
    upsertGuestAccount({ id: "saved", riotId: "Renamed#TR1", game: "valorant", preference, updatedAt: "b" });
    expect(readGuestAccounts()).toEqual([
      expect.objectContaining({ id: "saved", riotId: "Renamed#TR1", updatedAt: "b" }),
    ]);
  });
});
