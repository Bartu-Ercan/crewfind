import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeLolProfile } from "@/backend/lol-profile/profile";

const PARSE_ENDPOINT = "https://api.parse.bot/scraper/a37a789e-d312-4d4e-b7cc-9407bfc6963f/get_lol_summoner_details";
const requestSchema = z.object({
  riotId: z.string().trim().min(3).max(22).regex(/^[^#]+#[\p{L}\p{N}]{2,5}$/u),
  server: z.enum(["tr1", "euw1"]),
});

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return NextResponse.json(body, { status, headers: { ...noStoreHeaders, ...headers } });
}

export async function GET() {
  return json({ enabled: Boolean(process.env.PARSE_BOT_API_KEY) });
}

export async function POST(request: Request) {
  const apiKey = process.env.PARSE_BOT_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !supabaseUrl || !publishableKey) {
    return json({ code: "PROFILE_LOOKUP_DISABLED" }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return json({ code: "AUTH_REQUIRED" }, 401);

  const payload = requestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return json({ code: "INVALID_PROFILE_REQUEST" }, 400);

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return json({ code: "AUTH_REQUIRED" }, 401);

  const { error: limitError } = await supabase.rpc("reserve_lol_profile_lookup");
  if (limitError) {
    const rateLimited = limitError.message.includes("RATE_LIMITED") || limitError.code === "PGRST";
    return json(
      { code: rateLimited ? "RATE_LIMITED" : "PROFILE_LOOKUP_UNAVAILABLE" },
      rateLimited ? 429 : 503,
      rateLimited ? { "Retry-After": "60" } : {},
    );
  }

  const url = new URL(PARSE_ENDPOINT);
  url.searchParams.set("name", payload.data.riotId);
  url.searchParams.set("region", payload.data.server === "tr1" ? "tr" : "euw");

  try {
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      cache: "force-cache",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
    const providerPayload = await response.json().catch(() => null);
    const upstreamNotFound = response.status === 404 || response.status === 422 ||
      (response.status === 502 && providerPayload?.error?.upstream_status_code === 404);
    if (upstreamNotFound) return json({ found: false });
    if (!response.ok) return json({ code: "PROFILE_LOOKUP_UNAVAILABLE" }, response.status === 429 ? 429 : 503);

    const profile = normalizeLolProfile(providerPayload);
    return profile ? json({ found: true, profile }) : json({ found: false });
  } catch {
    return json({ code: "PROFILE_LOOKUP_UNAVAILABLE" }, 503);
  }
}
