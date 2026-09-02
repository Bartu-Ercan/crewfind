export const AUTH_TERMS_STORAGE_KEY = "crewfind-auth-terms";
export const AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY = "crewfind-auth-oauth-terms-pending";
export const AUTH_MODAL_MODE_STORAGE_KEY = "crewfind-auth-open-mode";
export const AUTH_NEEDS_PASSWORD_STORAGE_KEY = "crewfind-needs-password";
export const AUTH_PENDING_INTENT_STORAGE_KEY = "crewfind-auth-pending-intent";

export type AuthCallbackIntent =
  | "oauth-login"
  | "oauth-link"
  | "email-confirm"
  | "email-link"
  | "password-recovery";

const CALLBACK_INTENTS = new Set<AuthCallbackIntent>([
  "oauth-login",
  "oauth-link",
  "email-confirm",
  "email-link",
  "password-recovery",
]);

const CALLBACK_PATHS = new Set([
  "/",
  "/valorant",
  "/league-of-legends",
  "/cs2",
  "/hesabim",
]);

export function parseAuthCallbackIntent(value: string | null): AuthCallbackIntent | null {
  return value && CALLBACK_INTENTS.has(value as AuthCallbackIntent)
    ? value as AuthCallbackIntent
    : null;
}

export function sanitizeAuthNext(value: string | null, fallback = "/valorant") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://crewfind.invalid");
    if (parsed.origin !== "https://crewfind.invalid" || !CALLBACK_PATHS.has(parsed.pathname)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthCallbackUrl(origin: string, intent: AuthCallbackIntent, next: string) {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("intent", intent);
  url.searchParams.set("next", sanitizeAuthNext(next));
  return url.toString();
}

export function callbackNeedsPassword(intent: AuthCallbackIntent) {
  return intent === "email-link" || intent === "password-recovery";
}

export function consumePendingOAuthTerms(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  intent: AuthCallbackIntent,
  termsVersion: string,
  userId: string,
) {
  if (intent !== "oauth-login" && intent !== "oauth-link") return false;
  if (storage.getItem(AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY) !== termsVersion) return false;
  storage.setItem(AUTH_TERMS_STORAGE_KEY, `${userId}:${termsVersion}`);
  storage.removeItem(AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY);
  return true;
}
