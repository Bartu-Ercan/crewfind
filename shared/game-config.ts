export type GameId = "valorant" | "league-of-legends" | "cs2";

export type FilterOption = {
  value: string;
  label: string;
  hint?: string;
};

export type RatingBand = {
  value: number;
  label: string;
  color: string;
};

export type RankOption = {
  name: string;
  tier: string;
  division?: string;
  color: string;
};

export const GAME_ROUTES: Record<GameId, string> = {
  valorant: "/valorant",
  "league-of-legends": "/league-of-legends",
  cs2: "/cs2",
};

const VALORANT_TIER_COLORS: Record<string, string> = {
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

const LOL_TIER_COLORS: Record<string, string> = {
  Demir: "#787f83",
  Bronz: "#a66a3f",
  Gümüş: "#aeb9c2",
  Altın: "#c99c42",
  Platin: "#48a89f",
  Zümrüt: "#39a66f",
  Elmas: "#6e87d8",
  Ustalık: "#9a67d6",
  Üstatlık: "#ca536d",
  Şampiyonluk: "#4c94c9",
};

function tieredRanks(
  tiers: readonly string[],
  divisions: readonly string[],
  colors: Record<string, string>,
) {
  return tiers.flatMap((tier) =>
    divisions.map((division) => ({
      name: `${tier} ${division}`,
      tier,
      division,
      color: colors[tier] ?? "#8a9690",
    })),
  );
}

export const VALORANT_RANKS: RankOption[] = [
  ...tieredRanks(
    ["Demir", "Bronz", "Gümüş", "Altın", "Platin", "Elmas", "Yücelik", "Ölümsüzlük"],
    ["1", "2", "3"],
    VALORANT_TIER_COLORS,
  ),
  { name: "Radyant", tier: "Radyant", division: "R", color: VALORANT_TIER_COLORS.Radyant },
];

export const LOL_RANKS: RankOption[] = [
  ...tieredRanks(
    ["Demir", "Bronz", "Gümüş", "Altın", "Platin", "Zümrüt", "Elmas"],
    ["IV", "III", "II", "I"],
    LOL_TIER_COLORS,
  ),
  { name: "Ustalık", tier: "Ustalık", division: "U", color: LOL_TIER_COLORS.Ustalık },
  { name: "Üstatlık", tier: "Üstatlık", division: "Ü", color: LOL_TIER_COLORS.Üstatlık },
  {
    name: "Şampiyonluk",
    tier: "Şampiyonluk",
    division: "Ş",
    color: LOL_TIER_COLORS.Şampiyonluk,
  },
];

const CS2_COMPETITIVE_NAMES = [
  "Silver I",
  "Silver II",
  "Silver III",
  "Silver IV",
  "Silver Elite",
  "Silver Elite Master",
  "Gold Nova I",
  "Gold Nova II",
  "Gold Nova III",
  "Gold Nova Master",
  "Master Guardian I",
  "Master Guardian II",
  "Master Guardian Elite",
  "Distinguished Master Guardian",
  "Legendary Eagle",
  "Legendary Eagle Master",
  "Supreme Master First Class",
  "Global Elite",
] as const;

function cs2CompetitiveColor(index: number) {
  if (index < 6) return "#aeb9c2";
  if (index < 10) return "#d0aa49";
  if (index < 14) return "#4b8fd8";
  if (index < 17) return "#9a67d6";
  return "#d55367";
}

export const CS2_COMPETITIVE_RANKS: RankOption[] = CS2_COMPETITIVE_NAMES.map(
  (name, index) => ({
    name,
    tier: name,
    division: String(index + 1),
    color: cs2CompetitiveColor(index),
  }),
);

export const VALORANT_SERVERS: FilterOption[] = [
  { value: "frankfurt", label: "Frankfurt" },
  { value: "paris", label: "Paris" },
  { value: "london", label: "London" },
  { value: "istanbul", label: "İstanbul" },
  { value: "stockholm", label: "Stockholm" },
  { value: "warsaw", label: "Warsaw" },
];

export const LOL_SERVERS: FilterOption[] = [
  { value: "tr1", label: "Türkiye (TR1)" },
  { value: "euw1", label: "EU West (EUW1)" },
];

export const CS2_REGIONS: FilterOption[] = [
  { value: "vienna", label: "Vienna", hint: "≈ 45–60 ms" },
  { value: "frankfurt", label: "Frankfurt", hint: "≈ 50–65 ms" },
  { value: "warsaw", label: "Warsaw", hint: "≈ 55–70 ms" },
  { value: "amsterdam", label: "Amsterdam", hint: "≈ 60–75 ms" },
  { value: "stockholm", label: "Stockholm", hint: "≈ 65–85 ms" },
  { value: "dubai", label: "Dubai", hint: "≈ 70–95 ms" },
];

export const CS2_RATING_BANDS: RatingBand[] = [
  { value: 1_000, label: "1.000 – 4.999", color: "#aeb9c2" },
  { value: 5_000, label: "5.000 – 9.499", color: "#6faee0" },
  { value: 9_500, label: "9.500 – 12.999", color: "#657bd9" },
  { value: 13_000, label: "13.000 – 16.999", color: "#8b67dc" },
  { value: 17_000, label: "17.000 – 19.499", color: "#ad55d5" },
  { value: 19_500, label: "19.500+", color: "#d05acb" },
];

export const VALORANT_QUEUES: FilterOption[] = [
  { value: "competitive", label: "Rekabetçi" },
  { value: "unrated", label: "Derecesiz" },
];

export const LOL_QUEUES: FilterOption[] = [
  { value: "solo-duo", label: "Dereceli Solo/Duo" },
  { value: "flex", label: "Dereceli Flex" },
];

export const CS2_QUEUES: FilterOption[] = [
  { value: "premier", label: "Premier" },
  { value: "competitive", label: "Competitive" },
];

export const LOL_ROLES: FilterOption[] = [
  { value: "top", label: "Üst" },
  { value: "jungle", label: "Orman" },
  { value: "mid", label: "Orta" },
  { value: "bottom", label: "Alt" },
  { value: "support", label: "Destek" },
];

export const CS2_MAPS: FilterOption[] = [
  { value: "ancient", label: "Ancient" },
  { value: "anubis", label: "Anubis" },
  { value: "cache", label: "Cache" },
  { value: "dust-ii", label: "Dust II" },
  { value: "inferno", label: "Inferno" },
  { value: "mirage", label: "Mirage" },
  { value: "nuke", label: "Nuke" },
  { value: "overpass", label: "Overpass" },
  { value: "train", label: "Train" },
  { value: "vertigo", label: "Vertigo" },
  { value: "office", label: "Office" },
  { value: "boulder", label: "Boulder" },
  { value: "fachwerk", label: "Fachwerk" },
  { value: "shelter", label: "Shelter" },
];

export type GameConfig = {
  id: GameId;
  name: string;
  shortName: string;
  heroTitle: string;
  heroDescription: string;
  serverGroupLabel: string;
  servers: FilterOption[];
  queues: FilterOption[];
  serverSelection: "single" | "multi";
  queueSelection: "single" | "multi";
  defaultServers: string[];
  defaultQueue: string;
  defaultRank: number;
  defaultMinRank: number;
  identity: "riot" | "steam";
};

export const GAME_CONFIGS: Record<GameId, GameConfig> = {
  valorant: {
    id: "valorant",
    name: "VALORANT",
    shortName: "VALORANT",
    heroTitle: "Eksik oyuncuyu bul.",
    heroDescription: "Rankına uygun oyuncularla saniyeler içinde eşleş.",
    serverGroupLabel: "VALORANT sunucusu",
    servers: VALORANT_SERVERS,
    queues: VALORANT_QUEUES,
    serverSelection: "multi",
    queueSelection: "multi",
    defaultServers: ["istanbul"],
    defaultQueue: "competitive",
    defaultRank: 10,
    defaultMinRank: 6,
    identity: "riot",
  },
  "league-of-legends": {
    id: "league-of-legends",
    name: "League of Legends",
    shortName: "LoL",
    heroTitle: "Takımındaki boşluğu doldur.",
    heroDescription: "Sunucu, sıra, rank ve rollere göre uyumlu oyuncuları bul.",
    serverGroupLabel: "LoL sunucusu",
    servers: LOL_SERVERS,
    queues: LOL_QUEUES,
    serverSelection: "single",
    queueSelection: "single",
    defaultServers: ["tr1"],
    defaultQueue: "solo-duo",
    defaultRank: 12,
    defaultMinRank: 8,
    identity: "riot",
  },
  cs2: {
    id: "cs2",
    name: "Counter-Strike 2",
    shortName: "CS2",
    heroTitle: "Takımını beşe tamamla.",
    heroDescription: "Rating, bölge ve harita tercihlerine uygun oyuncuları bul.",
    serverGroupLabel: "Bağlantı bölgesi",
    servers: CS2_REGIONS,
    queues: CS2_QUEUES,
    serverSelection: "multi",
    queueSelection: "single",
    defaultServers: ["vienna"],
    defaultQueue: "premier",
    defaultRank: 9_500,
    defaultMinRank: 5_000,
    identity: "steam",
  },
};

export function rankSystemFor(game: GameId, queueType: string) {
  if (game === "league-of-legends") return queueType === "flex" ? "lol-flex" : "lol-solo";
  if (game === "cs2") return queueType === "competitive" ? "cs2-competitive" : "cs2-premier";
  return "valorant";
}

export function ranksFor(game: GameId, queueType: string) {
  if (game === "league-of-legends") return LOL_RANKS;
  if (game === "cs2" && queueType === "competitive") return CS2_COMPETITIVE_RANKS;
  return VALORANT_RANKS;
}

export function rankNameFor(game: GameId, queueType: string, value: number) {
  if (game === "cs2" && queueType === "premier") {
    return CS2_RATING_BANDS.find((band) => band.value === value)?.label ?? "Bilinmiyor";
  }
  return ranksFor(game, queueType)[value]?.name ?? "Bilinmiyor";
}

export function optionLabel(options: FilterOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function selectionLabel(options: FilterOption[], values: string[], fallback: string) {
  const labels = values.map((value) => optionLabel(options, value));
  if (!labels.length) return fallback;
  return labels.length <= 2 ? labels.join(" + ") : `${labels.length} seçim`;
}
