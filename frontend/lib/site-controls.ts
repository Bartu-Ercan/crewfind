export type SiteControls = { matchmaking: boolean; feedback: boolean; ads: boolean };
export const DEFAULT_SITE_CONTROLS: SiteControls = { matchmaking: true, feedback: true, ads: true };

export function parseSiteControls(value: unknown): SiteControls | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.matchmaking !== "boolean" || typeof data.feedback !== "boolean" || typeof data.ads !== "boolean") return null;
  return { matchmaking: data.matchmaking, feedback: data.feedback, ads: data.ads };
}
