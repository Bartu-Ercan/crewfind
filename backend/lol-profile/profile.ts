import { z } from "zod";

const text = z.string().trim().max(80);

const matchSchema = z.object({
  champion: text,
  result: text,
  kda: text,
  type: text,
  duration: text,
});

const responseSchema = z.object({
  status: z.string().optional(),
  data: z.object({
    name: text,
    region: text.optional().default(""),
    rank: z.object({
      tier: text,
      lp: text,
    }).nullable().optional(),
    match_history: z.array(matchSchema).optional().default([]),
  }),
});

export type LolProfile = {
  riotId: string;
  region: string;
  rank: { tier: string; lp: string } | null;
  recentMatches: Array<{
    champion: string;
    result: string;
    kda: string;
    queue: string;
    duration: string;
  }>;
  source: "LeagueOfGraphs";
  fetchedAt: string;
};

export function normalizeLolProfile(value: unknown, fetchedAt = new Date().toISOString()): LolProfile | null {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) return null;

  return {
    riotId: parsed.data.data.name,
    region: parsed.data.data.region,
    rank: parsed.data.data.rank ?? null,
    recentMatches: parsed.data.data.match_history.slice(0, 5).map((match) => ({
      champion: match.champion,
      result: match.result,
      kda: match.kda,
      queue: match.type,
      duration: match.duration,
    })),
    source: "LeagueOfGraphs",
    fetchedAt,
  };
}
