import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEventHandler } from "react";

const CLOSE_GRACE_MS = 180;
const CLOSE_FADE_MS = 140;

export function useDelayedHoverClose(active: boolean, onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    graceTimer.current = null;
    closeTimer.current = null;
  }, []);

  const cancelClose = useCallback(() => {
    clearTimers();
    setClosing(false);
  }, [clearTimers]);

  const handlePointerEnter: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (event.pointerType === "mouse") cancelClose();
    },
    [cancelClose],
  );

  const handlePointerLeave: PointerEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (!active || event.pointerType !== "mouse") return;

      clearTimers();
      graceTimer.current = setTimeout(() => {
        setClosing(true);
        closeTimer.current = setTimeout(() => {
          onClose();
          setClosing(false);
        }, CLOSE_FADE_MS);
      }, CLOSE_GRACE_MS);
    },
    [active, clearTimers, onClose],
  );

  useEffect(() => {
    if (!active) cancelClose();
    return clearTimers;
  }, [active, cancelClose, clearTimers]);

  return { closing, cancelClose, handlePointerEnter, handlePointerLeave };
}
