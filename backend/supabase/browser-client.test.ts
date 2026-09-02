import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

describe("Supabase browser client", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createClient.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  });

  it("leaves PKCE code exchange to the callback page", async () => {
    const { getSupabaseBrowserClient } = await import("./browser-client");

    getSupabaseBrowserClient();

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      expect.objectContaining({
        auth: expect.objectContaining({
          detectSessionInUrl: false,
          flowType: "pkce",
        }),
      }),
    );
  });
});
