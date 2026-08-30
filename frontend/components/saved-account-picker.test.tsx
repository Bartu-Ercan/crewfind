// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedAccountPicker, type SelectableRiotAccount } from "./saved-account-picker";

const reactTestGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

beforeAll(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

const accounts: SelectableRiotAccount[] = [
  {
    id: "one",
    riotId: "First#TR1",
    verificationStatus: "manual",
    lastUsedAt: "2026-08-30T10:00:00Z",
    preferences: [],
  },
  {
    id: "two",
    riotId: "Second#EUW",
    verificationStatus: "manual",
    lastUsedAt: "2026-08-29T10:00:00Z",
    preferences: [],
  },
];

describe("SavedAccountPicker", () => {
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
  });

  async function renderPicker(overrides: Partial<React.ComponentProps<typeof SavedAccountPicker>> = {}) {
    await act(async () => root.render(
      <SavedAccountPicker
        accounts={accounts}
        selectedId="one"
        disabled={false}
        onSelect={vi.fn()}
        {...overrides}
      />,
    ));
  }

  it("does not render an empty decorative trigger", async () => {
    await renderPicker({ accounts: [] });
    expect(container.querySelector("button")).toBeNull();
  });

  it("opens only the saved Riot account list", async () => {
    await renderPicker();
    const trigger = container.querySelector<HTMLButtonElement>("button[aria-haspopup='menu']")!;
    expect(trigger.textContent).toContain("Kayıtlı hesaplar");
    expect(trigger.parentElement?.className).toContain("right-[18px]");
    expect(trigger.parentElement?.className).not.toContain("left-[18px]");
    expect(container.textContent).not.toContain("Kaydet");
    expect(container.textContent).not.toContain("Yeni hesap");

    await act(async () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const menu = container.querySelector("[role='menu']");
    expect(menu).not.toBeNull();
    expect(menu?.className).toContain("bottom-[calc(100%+6px)]");
    expect(menu?.className).toContain("right-[-18px]");
    expect(menu?.className).toContain("origin-bottom-right");
    expect(container.querySelectorAll("[role='menuitemradio']")).toHaveLength(2);
  });

  it("supports arrow focus, selection and Escape focus return", async () => {
    const onSelect = vi.fn();
    await renderPicker({ onSelect });
    const trigger = container.querySelector<HTMLButtonElement>("button[aria-haspopup='menu']")!;

    await act(async () => trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    const options = [...container.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']")];
    expect(document.activeElement).toBe(options[0]);

    await act(async () => options[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(document.activeElement).toBe(options[1]);

    await act(async () => options[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector("[role='menu']")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await act(async () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const reopenedOptions = [...container.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']")];
    await act(async () => reopenedOptions[1].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith(accounts[1]);
  });

  it("closes when focus or pointer moves outside", async () => {
    await renderPicker();
    const trigger = container.querySelector<HTMLButtonElement>("button[aria-haspopup='menu']")!;

    await act(async () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector("[role='menu']")).not.toBeNull();

    await act(async () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    expect(container.querySelector("[role='menu']")).toBeNull();

    await act(async () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const outside = document.createElement("button");
    document.body.append(outside);
    await act(async () => outside.focus());
    expect(container.querySelector("[role='menu']")).toBeNull();
    outside.remove();
  });
});
