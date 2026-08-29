import type { SearchInput } from "@/shared/validation";
import type { GameId } from "@/shared/game-config";

export type SavedGamePreference = Omit<SearchInput, "displayName" | "contactValue">;

export type SavedRiotAccount = {
  id: string;
  riotId: string;
  verificationStatus: "manual" | "verified";
  lastUsedAt: string | null;
  preferences: SavedGamePreference[];
};

export type AccountOverview = {
  userId: string;
  isAnonymous: boolean;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  termsVersion: string | null;
  providers: string[];
  riotAccounts: SavedRiotAccount[];
};

export type GuestRiotAccount = {
  id: string;
  riotId: string;
  game: Extract<GameId, "valorant" | "league-of-legends">;
  preference: SavedGamePreference;
  updatedAt: string;
};

export const TERMS_VERSION = "2026-08-29";
export const GUEST_ACCOUNTS_STORAGE_KEY = "crewfind-guest-riot-accounts-v1";

