// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY } from "@/frontend/lib/auth-flow";
import { AuthMenu } from "./auth-menu";

const mocks = vi.hoisted(() => ({
  user: null as { is_anonymous: boolean; user_metadata?: Record<string, unknown> } | null,
  overview: null as { username: string; email: string; avatarUrl: null } | null,
  isPermanent: false,
  refresh: vi.fn(async () => undefined),
  signInWithOAuth: vi.fn(async () => ({ data: { provider: "google", url: "https://accounts.google.com" }, error: null })),
  linkIdentity: vi.fn(async () => ({ data: { provider: "google", url: "https://accounts.google.com" }, error: null })),
  updateUser: vi.fn(async () => ({ data: { user: null }, error: null as null | { code: string; message: string } })),
  signInWithOtp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ className, options }: { className?: string; options?: { action?: string; size?: string; tabIndex?: number; responseField?: boolean } }) => <div className={className} data-testid="turnstile" data-action={options?.action} data-size={options?.size} data-tab-index={options?.tabIndex} data-response-field={String(options?.responseField)} />,
}));

vi.mock("@/backend/supabase/browser-client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      linkIdentity: mocks.linkIdentity,
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: vi.fn(async () => ({ error: null })),
      signInWithOtp: mocks.signInWithOtp,
      updateUser: mocks.updateUser,
    },
  }),
}));

vi.mock("@/frontend/components/account-provider", () => ({
  useAccount: () => ({
    user: mocks.user,
    overview: mocks.overview,
    isPermanent: mocks.isPermanent,
    loading: false,
    refresh: mocks.refresh,
  }),
}));

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("AuthMenu", () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousGoogle: string | undefined;
  let previousTurnstile: string | undefined;
  let previousSiteKey: string | undefined;

  beforeEach(() => {
    previousGoogle = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED;
    previousTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED;
    previousSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = "true";
    process.env.NEXT_PUBLIC_TURNSTILE_ENABLED = "true";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
    mocks.signInWithOAuth.mockClear();
    mocks.linkIdentity.mockClear();
    mocks.updateUser.mockClear();
    mocks.signInWithOtp.mockClear();
    mocks.user = null;
    mocks.overview = null;
    mocks.isPermanent = false;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = previousGoogle;
    process.env.NEXT_PUBLIC_TURNSTILE_ENABLED = previousTurnstile;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previousSiteKey;
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  async function openMenu() {
    await act(async () => root.render(<AuthMenu disabled={false} theme="light" />));
    const trigger = container.querySelector<HTMLButtonElement>("button[aria-haspopup='dialog']")!;
    await act(async () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  }

  it("shows only Google and email without mounting Turnstile initially", async () => {
    await openMenu();

    expect(container.textContent).toContain("Google ile devam et");
    expect(container.textContent).not.toContain("Discord");
    expect(container.textContent).not.toContain("Riot ile");
    expect(container.querySelectorAll(".google-mark path")).toHaveLength(4);
    expect(container.querySelector("[data-testid='turnstile']")).toBeNull();
  });

  it("fades and closes the signed profile menu after the mouse leaves", async () => {
    vi.useFakeTimers();
    mocks.isPermanent = true;
    mocks.overview = { username: "crew_user", email: "crew@example.com", avatarUrl: null };
    await act(async () => root.render(<AuthMenu disabled={false} theme="light" />));
    const trigger = container.querySelector<HTMLButtonElement>("button[aria-haspopup='menu']")!;
    await act(async () => trigger.click());

    const menuRoot = container.querySelector<HTMLElement>(".account-menu")!;
    const pointerOut = new Event("pointerout", { bubbles: true });
    Object.defineProperty(pointerOut, "pointerType", { value: "mouse" });
    Object.defineProperty(pointerOut, "relatedTarget", { value: document.body });
    await act(async () => menuRoot.dispatchEvent(pointerOut));
    await act(async () => vi.advanceTimersByTime(180));

    expect(container.querySelector(".signed-popover")?.classList.contains("closing")).toBe(true);
    await act(async () => vi.advanceTimersByTime(140));
    expect(container.querySelector(".signed-popover")).toBeNull();
  });

  it("opens password setup from persistent user metadata", async () => {
    mocks.user = { is_anonymous: false, user_metadata: { needs_password: true } };

    await act(async () => root.render(<AuthMenu disabled={false} theme="light" />));

    expect(container.textContent).toContain("Parolanı oluştur");
    expect(container.querySelector<HTMLInputElement>("input[type='password']")).not.toBeNull();
  });

  it("starts Google OAuth without a CAPTCHA token", async () => {
    await openMenu();
    const email = container.querySelector<HTMLInputElement>("input[type='email']")!;
    const google = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Google ile devam et"))!;

    await act(async () => email.focus());
    expect(container.querySelector("[data-testid='turnstile']")).not.toBeNull();
    await act(async () => google.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(localStorage.getItem(AUTH_OAUTH_TERMS_PENDING_STORAGE_KEY)).toBe("2026-08-29");
    expect(container.querySelector("[data-testid='turnstile']")).toBeNull();
    expect(container.querySelector(".terms-check")).toBeNull();
    expect(container.querySelector(".auth-social-consent")?.textContent).toContain("Google ile devam ederek");
  });

  it("keeps explicit terms consent for email registration", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_ENABLED = "false";
    await openMenu();
    const register = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Hesap oluştur")!;
    await act(async () => register.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const fields = container.querySelectorAll<HTMLInputElement>(".auth-form input");
    const setValue = (input: HTMLInputElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    await act(async () => {
      setValue(fields[0], "new@example.com");
    });

    expect(container.querySelector(".terms-check input")).not.toBeNull();
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(container.textContent).toContain("Gizlilik ve kullanım koşullarını kabul et.");
    expect(container.querySelector("input[type='password']")).toBeNull();
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("mounts only an invisible background Turnstile after email interaction", async () => {
    await openMenu();
    const email = container.querySelector<HTMLInputElement>("input[type='email']")!;

    await act(async () => email.focus());

    const turnstile = container.querySelector<HTMLElement>("[data-testid='turnstile']");
    expect(turnstile?.classList.contains("turnstile-sentinel")).toBe(true);
    expect(turnstile?.dataset.size).toBe("invisible");
    expect(turnstile?.dataset.action).toBe("email_auth");
    expect(turnstile?.dataset.tabIndex).toBe("-1");
    expect(turnstile?.dataset.responseField).toBe("false");
  });

  it("moves an existing email upgrade to the login flow with a clear message", async () => {
    mocks.user = { is_anonymous: true };
    mocks.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "email_exists", message: "A user with this email address has already been registered" },
    });
    await openMenu();
    const register = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Hesap oluştur")!;
    await act(async () => register.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const email = container.querySelector<HTMLInputElement>("input[type='email']")!;
    const terms = container.querySelector<HTMLInputElement>(".terms-check input")!;

    await act(async () => {
      email.value = "registered@example.com";
      email.dispatchEvent(new Event("input", { bubbles: true }));
      terms.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(container.textContent).toContain("Bu e-posta zaten kayıtlı. Giriş yap veya parolanı yenile.");
    expect(container.querySelector<HTMLButtonElement>(".auth-mode-switch button[aria-pressed='true']")?.textContent).toBe("Giriş yap");
    expect(container.querySelector("input[type='password']")).not.toBeNull();
  });

  it("marks an anonymous email upgrade as requiring a password", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_ENABLED = "false";
    mocks.user = { is_anonymous: true };
    await openMenu();
    const register = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Hesap oluştur")!;
    await act(async () => register.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const email = container.querySelector<HTMLInputElement>("input[type='email']")!;
    const terms = container.querySelector<HTMLInputElement>(".terms-check input")!;

    await act(async () => {
      email.value = "new@example.com";
      email.dispatchEvent(new Event("input", { bubbles: true }));
      terms.click();
    });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(mocks.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ needs_password: true }) }),
      expect.any(Object),
    );
  });

  it("uses the same email-only verification flow for a clean browser", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_ENABLED = "false";
    await openMenu();
    const register = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Hesap oluştur")!;
    await act(async () => register.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const fields = container.querySelectorAll<HTMLInputElement>(".auth-form input");
    const setValue = (input: HTMLInputElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    await act(async () => {
      setValue(fields[0], "new@example.com");
      fields[1].click();
    });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "new@example.com",
      options: expect.objectContaining({
        shouldCreateUser: true,
        data: expect.objectContaining({ needs_password: true }),
      }),
    });
    expect(container.querySelector("input[type='password']")).toBeNull();
    expect(container.textContent).toContain("E-postanı kontrol et. Doğrulama bağlantısından sonra parolanı oluştur.");
    expect(container.textContent).toContain("E-posta adresini değiştir");
    expect([...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Google ile devam et"))?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>(".auth-submit")?.disabled).toBe(true);
  });
});
