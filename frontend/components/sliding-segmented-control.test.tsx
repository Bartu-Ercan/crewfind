// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SlidingSegmentedControl } from "./sliding-segmented-control";

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => { reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT; });

describe("SlidingSegmentedControl", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("moves one indicator to the selected option", async () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const options = [1, 2, 3, 4].map((value) => ({ value, label: String(value) }));
    await act(async () => root.render(<SlidingSegmentedControl className="party-picker" options={options} value={1} onChange={() => undefined} />));
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];
    Object.defineProperties(buttons[3], {
      offsetLeft: { value: 240 },
      offsetTop: { value: 4 },
      offsetWidth: { value: 76 },
      offsetHeight: { value: 40 },
    });

    await act(async () => root.render(<SlidingSegmentedControl className="party-picker" options={options} value={4} onChange={() => undefined} />));

    const indicator = container.querySelector<HTMLElement>(".segmented-indicator")!;
    expect(indicator.style.transform).toBe("translate3d(240px, 4px, 0)");
    expect(indicator.style.width).toBe("76px");
    expect(container.querySelectorAll(".segmented-indicator")).toHaveLength(1);
    expect(buttons[3].getAttribute("aria-pressed")).toBe("true");
  });

  it("does not call onChange for a disabled option", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(<SlidingSegmentedControl className="party-picker" options={[{ value: 1, label: "1" }, { value: 2, label: "2", disabled: true }]} value={1} onChange={onChange} />));
    await act(async () => container.querySelectorAll<HTMLButtonElement>("button")[1].click());
    expect(onChange).not.toHaveBeenCalled();
  });
});
