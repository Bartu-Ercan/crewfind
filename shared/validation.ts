import { z } from "zod";
import { QUEUE_TYPES, VALORANT_SERVERS } from "@/shared/queue-filters";

export const searchSchema = z
  .object({
    riotId: z
      .string()
      .trim()
      .min(7, "Riot ID, İsim#ETİKET biçiminde olmalı.")
      .max(24, "Riot ID çok uzun.")
      .regex(/^[^#]{3,16}#[\p{L}\p{N}]{3,5}$/u, "İsim#ETİKET biçimini kullan."),
    rank: z.number().int().min(0).max(24),
    minRank: z.number().int().min(0).max(24),
    maxRank: z.number().int().min(0).max(24).default(24),
    partySize: z.number().int().min(1).max(4),
    targetSize: z.number().int().min(2).max(5),
    servers: z
      .array(
        z.enum(
          VALORANT_SERVERS.map((option) => option.value) as [
            "frankfurt",
            "paris",
            "london",
            "istanbul",
            "stockholm",
            "warsaw",
          ],
        ),
      )
      .min(1, "En az bir sunucu seç.")
      .max(VALORANT_SERVERS.length),
    queueTypes: z
      .array(z.enum(QUEUE_TYPES.map((option) => option.value) as ["competitive", "unrated"]))
      .min(1, "En az bir kuyruk seç.")
      .max(QUEUE_TYPES.length),
  })
  .refine((data) => data.minRank <= data.maxRank, {
    message: "Minimum rank maksimumdan büyük olamaz.",
    path: ["minRank"],
  })
  .refine((data) => data.partySize <= data.targetSize, {
    message: "Grup büyüklüğü oyun hedefinden büyük olamaz.",
    path: ["partySize"],
  });

export type SearchInput = z.infer<typeof searchSchema>;
