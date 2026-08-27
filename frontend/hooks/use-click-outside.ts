import { useEffect } from "react";
import type { RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        onOutside();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [active, onOutside, ref]);
}
