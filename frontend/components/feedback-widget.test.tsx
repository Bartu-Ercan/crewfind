// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackWidget } from "./feedback-widget";

vi.mock("@/backend/supabase/browser-client", () => ({
  hasSupabaseConfig: () => false,
  getSupabaseBrowserClient: vi.fn(),
}));

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("FeedbackWidget", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ received: true, delivered: true })));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function open() {
    await act(async () => root.render(<FeedbackWidget sourcePath="/valorant" />));
    const trigger = container.querySelector<HTMLButtonElement>(".feedback-footer button")!;
    await act(async () => trigger.click());
  }

  it("keeps the entry point compact and opens an accessible modal", async () => {
    await open();

    expect(container.querySelector("[role='dialog']")).not.toBeNull();
    expect(container.textContent).toContain("Fikrini paylaş");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("sends the selected kind, message and route", async () => {
    await open();
    const message = container.querySelector<HTMLTextAreaElement>("textarea")!;
    const bug = [...container.querySelectorAll<HTMLButtonElement>(".feedback-kinds button")]
      .find((button) => button.textContent === "Hata")!;

    await act(async () => {
      bug.click();
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
        message,
        "Windows üzerinde animasyon sabit kalıyor.",
      );
      message.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector<HTMLFormElement>("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetch).toHaveBeenCalledWith("/api/feedback", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        kind: "bug",
        message: "Windows üzerinde animasyon sabit kalıyor.",
        replyEmail: "",
        sourcePath: "/valorant",
        website: "",
      }),
    }));
    expect(container.textContent).toContain("Mesajın alındı");
  });
});
