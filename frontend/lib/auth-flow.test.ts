import { describe, expect, it } from "vitest";
import {
  AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY,
  AUTH_TERMS_STORAGE_KEY,
  buildAuthCallbackUrl,
  callbackNeedsPassword,
  consumePendingOAuthTerms,
  parseAuthCallbackIntent,
  sanitizeAuthNext,
} from "./auth-flow";

describe("auth callback flow", () => {
  it("accepts only known callback intents", () => {
    expect(parseAuthCallbackIntent("oauth-login")).toBe("oauth-login");
    expect(parseAuthCallbackIntent("password-recovery")).toBe("password-recovery");
    expect(parseAuthCallbackIntent("admin")).toBeNull();
    expect(parseAuthCallbackIntent(null)).toBeNull();
  });

  it("allows only CrewFind application routes", () => {
    expect(sanitizeAuthNext("/hesabim?tab=riot#saved")).toBe("/hesabim?tab=riot#saved");
    expect(sanitizeAuthNext("/cs2")).toBe("/cs2");
    expect(sanitizeAuthNext("//evil.example")).toBe("/valorant");
    expect(sanitizeAuthNext("https://evil.example")).toBe("/valorant");
    expect(sanitizeAuthNext("/auth/callback")).toBe("/valorant");
    expect(sanitizeAuthNext("/\\evil.example")).toBe("/valorant");
  });

  it("builds an allowlisted callback URL", () => {
    const url = new URL(buildAuthCallbackUrl("https://crewfind.vercel.app", "oauth-link", "/league-of-legends"));
    expect(url.origin).toBe("https://crewfind.vercel.app");
    expect(url.searchParams.get("intent")).toBe("oauth-link");
    expect(url.searchParams.get("next")).toBe("/league-of-legends");
  });

  it("opens password setup only for verified email links and recovery", () => {
    expect(callbackNeedsPassword("email-link")).toBe(true);
    expect(callbackNeedsPassword("password-recovery")).toBe(true);
    expect(callbackNeedsPassword("email-confirm")).toBe(false);
  });

  it("records Google terms only after a successful OAuth callback", () => {
    const values = new Map([[AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY, "2026-08-29"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    expect(consumePendingOAuthTerms(storage, "email-confirm", "2026-08-29")).toBe(false);
    expect(values.has(AUTH_TERMS_STORAGE_KEY)).toBe(false);
    expect(consumePendingOAuthTerms(storage, "oauth-login", "2026-08-29")).toBe(true);
    expect(values.get(AUTH_TERMS_STORAGE_KEY)).toBe("2026-08-29");
    expect(values.has(AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY)).toBe(false);
  });
});
