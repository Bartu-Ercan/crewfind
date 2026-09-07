// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrewFindApp } from "./crewfind-app";
import type { GameId } from "@/shared/game-config";

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  rpc: vi.fn(),
  account: { user: null, overview: null, isPermanent: false, refresh: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("./account-provider", () => ({ useAccount: () => mocks.account }));
vi.mock("./auth-menu", () => ({ AuthMenu: () => null }));
vi.mock("./game-selector", () => ({ GameSelector: ({ disabled }: { disabled: boolean }) => <button disabled={disabled}>Oyun seç</button> }));
vi.mock("@/backend/supabase/browser-client", () => ({
  hasSupabaseConfig: () => true,
  getSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: "test" } } } }) },
    rpc: mocks.rpc,
  }),
}));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ enabled: false }) })));
  vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_ENABLED", "false");
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe.each<GameId>(["valorant", "league-of-legends", "cs2"])("%s home-only navigation", (game) => {
  it.each(["idle", "searching", "proposed", "lobby"])("respects the game lock after restoring %s", async (status) => {
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === "get_my_status" ? { status, game, members: [] } : 0,
      error: null,
    }));
    await act(async () => root.render(
      <CrewFindApp game={game}><a href="/cs2" data-testid="seo-link">Oyun rehberi</a></CrewFindApp>,
    ));
    expect(Boolean(container.querySelector('[data-testid="seo-link"]'))).toBe(status === "idle");
    const gameButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Oyun seç");
    expect(gameButton?.disabled).toBe(status !== "idle");
  });
});
