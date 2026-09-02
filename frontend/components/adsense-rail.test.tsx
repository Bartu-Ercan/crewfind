// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdSenseRail } from "./adsense-rail";

vi.mock("next/script", () => ({
  default: ({ id, src }: { id: string; src: string }) => <script id={id} src={src} />,
}));

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
const adsenseWindow = window as Window & { adsbygoogle?: Array<Record<string, never>> };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("AdSenseRail", () => {
  let container: HTMLDivElement;
  let root: Root;
  const previous = {
    enabled: process.env.NEXT_PUBLIC_ADSENSE_ENABLED,
    consent: process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY,
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
    slot: process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT,
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    delete adsenseWindow.adsbygoogle;
    window.sessionStorage.clear();
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = "false";
    process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY = "false";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "";
    process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT = "";
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = previous.enabled;
    process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY = previous.consent;
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = previous.client;
    process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT = previous.slot;
  });

  it("renders nothing before publisher and consent configuration is complete", async () => {
    await act(async () => root.render(<AdSenseRail active />));

    expect(container.innerHTML).toBe("");
    expect(adsenseWindow.adsbygoogle).toBeUndefined();
  });

  it("does not request or render an ad outside the desktop rail breakpoint", async () => {
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-1234567890123456";
    process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT = "1234567890";

    await act(async () => root.render(<AdSenseRail active />));

    expect(container.innerHTML).toBe("");
    expect(adsenseWindow.adsbygoogle).toBeUndefined();
  });

  it("requests one labeled desktop unit when every guard is enabled", async () => {
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-1234567890123456";
    process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT = "1234567890";
    window.sessionStorage.setItem("crewfind-ad-rail-side", "left");

    await act(async () => root.render(<AdSenseRail active />));

    expect(container.querySelector("aside")?.getAttribute("aria-label")).toBe("Reklam");
    expect(container.querySelector("aside")?.getAttribute("data-side")).toBe("left");
    expect(container.querySelector("ins")?.getAttribute("data-ad-slot")).toBe("1234567890");
    expect(container.querySelector("script")?.getAttribute("src")).toContain("ca-pub-1234567890123456");
    expect(adsenseWindow.adsbygoogle).toHaveLength(1);

    await act(async () => root.render(<AdSenseRail active />));
    expect(adsenseWindow.adsbygoogle).toHaveLength(1);
  });

  it.each(["left", "right"] as const)("keeps the session rail on the %s side", async (side) => {
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-1234567890123456";
    process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT = "1234567890";
    window.sessionStorage.setItem("crewfind-ad-rail-side", side);

    await act(async () => root.render(<AdSenseRail active />));

    expect(container.querySelector("aside")?.getAttribute("data-side")).toBe(side);
    expect(container.querySelectorAll("ins")).toHaveLength(1);
    expect(adsenseWindow.adsbygoogle).toHaveLength(1);
  });

  it("chooses and persists one side for a new session", async () => {
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY = "true";
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-1234567890123456";
    process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT = "1234567890";

    await act(async () => root.render(<AdSenseRail active />));

    const side = container.querySelector("aside")?.getAttribute("data-side");
    expect(["left", "right"]).toContain(side);
    expect(window.sessionStorage.getItem("crewfind-ad-rail-side")).toBe(side);
    expect(container.querySelectorAll("ins")).toHaveLength(1);
  });
});
