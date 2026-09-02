// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallbackPage from "./page";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/backend/supabase/browser-client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}));

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("AuthCallbackPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset();
    window.history.replaceState({}, "", "/auth/callback?code=pkce-code&intent=email-confirm&next=%2Fvalorant");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("exchanges the PKCE code exactly once", async () => {
    mocks.exchangeCodeForSession.mockImplementation(() => new Promise(() => undefined));

    await act(async () => root.render(<AuthCallbackPage />));
    await act(async () => Promise.resolve());

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
  });

  it("shows an error only when the explicit code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid flow state" },
    });

    await act(async () => root.render(<AuthCallbackPage />));
    await act(async () => Promise.resolve());

    expect(container.textContent).toContain("Giriş bağlantısı geçersiz veya süresi dolmuş.");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledOnce();
  });
});
