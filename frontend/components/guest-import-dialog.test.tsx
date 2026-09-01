// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GuestImportDialog } from "./guest-import-dialog";

const mocks = vi.hoisted(() => ({
  user: { is_anonymous: false, user_metadata: { needs_password: true } },
  overview: { username: "oyuncu" },
  refresh: vi.fn(async () => undefined),
  readGuestAccounts: vi.fn(() => [{
    id: "guest-1",
    riotId: "Oyuncu#TR1",
    game: "valorant",
    preference: {},
  }]),
}));

vi.mock("@/backend/supabase/browser-client", () => ({
  getSupabaseBrowserClient: () => ({ rpc: vi.fn() }),
}));

vi.mock("@/frontend/components/account-provider", () => ({
  useAccount: () => ({
    user: mocks.user,
    isPermanent: true,
    overview: mocks.overview,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/frontend/lib/guest-accounts", () => ({
  readGuestAccounts: mocks.readGuestAccounts,
  removeGuestAccounts: vi.fn(),
}));

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("GuestImportDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.user.user_metadata.needs_password = true;
    mocks.readGuestAccounts.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("waits until password setup is complete", async () => {
    await act(async () => root.render(<GuestImportDialog />));

    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(mocks.readGuestAccounts).not.toHaveBeenCalled();
  });

  it("shows guest profiles after password setup", async () => {
    mocks.user.user_metadata.needs_password = false;
    await act(async () => root.render(<GuestImportDialog />));

    expect(container.textContent).toContain("Hesabına aktar");
    expect(mocks.readGuestAccounts).toHaveBeenCalledOnce();
  });
});
