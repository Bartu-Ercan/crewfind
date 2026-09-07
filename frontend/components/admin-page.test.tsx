// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "./admin-page";
const mocks = vi.hoisted(() => ({ user: { id: "owner", is_anonymous: false }, rpc: vi.fn() }));
vi.mock("./account-provider", () => ({ useAccount: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/backend/supabase/browser-client", () => ({ getSupabaseBrowserClient: () => ({ rpc: mocks.rpc }) }));
let root: Root; let container: HTMLDivElement;
const dashboard = {
  updatedAt: "2026-09-07T10:00:00Z", role: "owner", controls: { matchmaking: true, feedback: true, ads: true },
  metrics: { activePlayers: 5, matchedPlayers: 10, openLobbies: 1, permanentAccounts: 2, feedbackPending: 0 },
  games: [], users: [], feedback: [], audit: [], jobs: [],
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("AdminPage", () => {
  it("does not render operational data after server authorization denies access", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "ADMIN_FORBIDDEN" } });
    await act(async () => root.render(<AdminPage />));
    expect(container.textContent).toContain("Bu hesap yönetim alanına erişemez");
    expect(container.querySelector('[aria-label="Sistem özeti"]')).toBeNull();
    expect(container.querySelector('[role="switch"]')).toBeNull();
  });
  it("requires confirmation and sends an explicit server-side control mutation", async () => {
    mocks.rpc.mockResolvedValue({ data: dashboard, error: null });
    vi.stubGlobal("confirm", vi.fn(() => true));
    await act(async () => root.render(<AdminPage />));
    const button = container.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Yeni aramalar"]')!;
    await act(async () => button.click());
    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("admin_action", { p_action: "set_control", p_payload: { key: "matchmaking", enabled: false } });
    expect(container.textContent).toContain("işlem geçmişine işlendi");
  });
  it("leaves controls disabled for a read-only administrator", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...dashboard, role: "viewer" }, error: null });
    await act(async () => root.render(<AdminPage />));
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('[role="switch"]')).every((button) => button.disabled)).toBe(true);
  });
});
