import { z } from "zod";
import {
  CS2_MAPS,
  GAME_CONFIGS,
  LOL_ROLES,
  rankSystemFor,
  ranksFor,
  type GameId,
} from "./game-config";

export type SearchInput = {
  game: GameId;
  displayName: string;
  contactValue: string;
  rankSystem: string;
  rank: number;
  minRank: number;
  maxRank: number;
  partySize: number;
  targetSize: number;
  servers: string[];
  queueTypes: string[];
  roles: string[];
  maps: string[];
};

const baseSchema = z.object({
  game: z.enum(["valorant", "league-of-legends", "cs2"]),
  displayName: z.string().trim().min(1, "Oyuncu adını gir.").max(32, "Oyuncu adı çok uzun."),
  contactValue: z.string().trim().max(32),
  rankSystem: z.string().trim().min(1),
  rank: z.number().int(),
  minRank: z.number().int(),
  maxRank: z.number().int(),
  partySize: z.number().int().min(1).max(4),
  targetSize: z.number().int().min(2).max(5),
  servers: z.array(z.string()).min(1, "En az bir sunucu seç."),
  queueTypes: z.array(z.string()).min(1, "En az bir kuyruk seç."),
  roles: z.array(z.string()),
  maps: z.array(z.string()),
});

const RIOT_ID_PATTERN = /^[^#]{3,16}#[\p{L}\p{N}]{3,5}$/u;
const FRIEND_CODE_PATTERN = /^\d{5,12}$/;

export const searchSchema = baseSchema.superRefine((data, context) => {
  const config = GAME_CONFIGS[data.game];
  const selectedQueue = data.queueTypes[0] ?? config.defaultQueue;
  const allowedServers = new Set(config.servers.map((option) => option.value));
  const allowedQueues = new Set(config.queues.map((option) => option.value));

  if (data.partySize > data.targetSize) {
    context.addIssue({ code: "custom", message: "Grup büyüklüğü oyun hedefinden büyük olamaz.", path: ["partySize"] });
  }
  if (data.minRank > data.rank || data.rank > data.maxRank) {
    context.addIssue({ code: "custom", message: "Rank aralığını kontrol et.", path: ["minRank"] });
  }
  if (data.servers.some((server) => !allowedServers.has(server))) {
    context.addIssue({ code: "custom", message: "Geçersiz sunucu seçimi.", path: ["servers"] });
  }
  if (config.serverSelection === "single" && data.servers.length !== 1) {
    context.addIssue({ code: "custom", message: "Tek bir sunucu seç.", path: ["servers"] });
  }
  if (data.queueTypes.some((queue) => !allowedQueues.has(queue))) {
    context.addIssue({ code: "custom", message: "Geçersiz kuyruk seçimi.", path: ["queueTypes"] });
  }
  if (config.queueSelection === "single" && data.queueTypes.length !== 1) {
    context.addIssue({ code: "custom", message: "Tek bir mod seç.", path: ["queueTypes"] });
  }
  if (data.rankSystem !== rankSystemFor(data.game, selectedQueue)) {
    context.addIssue({ code: "custom", message: "Rank sistemi seçilen modla uyuşmuyor.", path: ["rankSystem"] });
  }

  if (data.game === "valorant" || data.game === "league-of-legends") {
    if (!RIOT_ID_PATTERN.test(data.displayName)) {
      context.addIssue({ code: "custom", message: "İsim#ETİKET biçimini kullan.", path: ["displayName"] });
    }
  }

  if (data.game === "league-of-legends") {
    const allowedRoles = new Set(LOL_ROLES.map((role) => role.value));
    if (data.roles.length !== data.partySize || new Set(data.roles).size !== data.roles.length) {
      context.addIssue({ code: "custom", message: `Takımındaki ${data.partySize} rolü seç.`, path: ["roles"] });
    }
    if (data.roles.some((role) => !allowedRoles.has(role))) {
      context.addIssue({ code: "custom", message: "Geçersiz rol seçimi.", path: ["roles"] });
    }
  } else if (data.roles.length) {
    context.addIssue({ code: "custom", message: "Bu oyunda rol filtresi kullanılamaz.", path: ["roles"] });
  }

  if (data.game === "cs2") {
    if (!FRIEND_CODE_PATTERN.test(data.contactValue)) {
      context.addIssue({ code: "custom", message: "Arkadaş kodu 5–12 haneli sayı olmalı.", path: ["contactValue"] });
    }
    if (selectedQueue === "premier") {
      if (data.rank < 1_000 || data.rank > 50_000 || data.minRank < 1_000 || data.maxRank > 50_000) {
        context.addIssue({ code: "custom", message: "CS Rating 1.000–50.000 arasında olmalı.", path: ["rank"] });
      }
      if (data.maps.length) {
        context.addIssue({ code: "custom", message: "Premier modunda harita filtresi kullanılmaz.", path: ["maps"] });
      }
    } else {
      const ranks = ranksFor(data.game, selectedQueue);
      if (data.rank < 0 || data.maxRank >= ranks.length) {
        context.addIssue({ code: "custom", message: "Geçersiz Competitive rankı.", path: ["rank"] });
      }
      const allowedMaps = new Set(CS2_MAPS.map((map) => map.value));
      if (!data.maps.length || data.maps.some((map) => !allowedMaps.has(map))) {
        context.addIssue({ code: "custom", message: "En az bir geçerli harita seç.", path: ["maps"] });
      }
    }
  } else {
    const ranks = ranksFor(data.game, selectedQueue);
    if (data.rank < 0 || data.maxRank >= ranks.length) {
      context.addIssue({ code: "custom", message: "Geçersiz rank seçimi.", path: ["rank"] });
    }
    if (data.maps.length) {
      context.addIssue({ code: "custom", message: "Bu oyunda harita filtresi kullanılamaz.", path: ["maps"] });
    }
  }
});

export function createInitialSearchInput(game: GameId): SearchInput {
  const config = GAME_CONFIGS[game];
  const queueType = config.defaultQueue;
  const maxRank = game === "cs2" && queueType === "premier"
    ? 50_000
    : ranksFor(game, queueType).length - 1;

  return {
    game,
    displayName: "",
    contactValue: "",
    rankSystem: rankSystemFor(game, queueType),
    rank: config.defaultRank,
    minRank: config.defaultMinRank,
    maxRank,
    partySize: 1,
    targetSize: 5,
    servers: [...config.defaultServers],
    queueTypes: [queueType],
    roles: game === "league-of-legends" ? [LOL_ROLES[0].value] : [],
    maps: [],
  };
}
