export const RANKS = [
  "Demir 1",
  "Demir 2",
  "Demir 3",
  "Bronz 1",
  "Bronz 2",
  "Bronz 3",
  "Gümüş 1",
  "Gümüş 2",
  "Gümüş 3",
  "Altın 1",
  "Altın 2",
  "Altın 3",
  "Platin 1",
  "Platin 2",
  "Platin 3",
  "Elmas 1",
  "Elmas 2",
  "Elmas 3",
  "Yücelik 1",
  "Yücelik 2",
  "Yücelik 3",
  "Ölümsüzlük 1",
  "Ölümsüzlük 2",
  "Ölümsüzlük 3",
  "Radyant",
] as const;

export type RankName = (typeof RANKS)[number];

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
