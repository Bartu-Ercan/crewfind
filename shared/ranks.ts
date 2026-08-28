import { VALORANT_RANKS } from "@/shared/game-config";

export const RANKS = VALORANT_RANKS.map((rank) => rank.name);

export type RankName = string;

export function rankName(value: number) {
  return RANKS[value] ?? "Bilinmiyor";
}

export const RANK_TIER_COLORS: Record<string, string> = {
  Demir: "#8a8a8a",
  Bronz: "#a9702f",
  Gümüş: "#c0c4c8",
  Altın: "#d9a441",
  Platin: "#1f9e93",
  Elmas: "#9451d6",
  Yücelik: "#39a66f",
  Ölümsüzlük: "#c41f2f",
  Radyant: "#f0c45c",
};

export function rankParts(value: string) {
  const [division] = value.match(/\d+$/) ?? [];
  const tier = division ? value.replace(/\s\d+$/, "") : value;
  return { tier, division };
}

export function clampRankRange(rank: number, min: number, max: number) {
  return {
    min: Math.min(rank, min),
    max: Math.max(rank, max),
  };
}
