// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareCrewFind } from "./share-crewfind";

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("ShareCrewFind", () => {
  let container: HTMLDivElement;
  let root: Root;
  const writeText = vi.fn(async () => undefined);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    writeText.mockClear();
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("copies a game-specific route when native sharing is unavailable", async () => {
    await act(async () => root.render(<ShareCrewFind game="valorant" />));
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/valorant"));
    expect(container.textContent).toContain("Bağlantı kopyalandı");
  });
});
