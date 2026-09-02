"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

type SegmentValue = string | number;

export type SlidingSegment<T extends SegmentValue> = {
  value: T;
  label: ReactNode;
  selectedLabel?: ReactNode;
  disabled?: boolean;
};

export function SlidingSegmentedControl<T extends SegmentValue>({
  className,
  options,
  value,
  onChange,
}: {
  className: string;
  options: SlidingSegment<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedKey = String(value);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const indicator = indicatorRef.current;
    if (!root || !indicator) return;

    const positionIndicator = () => {
      const selected = buttonRefs.current.get(selectedKey);
      if (!selected) return;
      indicator.style.width = `${selected.offsetWidth}px`;
      indicator.style.height = `${selected.offsetHeight}px`;
      indicator.style.transform = `translate3d(${selected.offsetLeft}px, ${selected.offsetTop}px, 0)`;
      indicator.dataset.ready = "true";
    };

    positionIndicator();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", positionIndicator);
      return () => window.removeEventListener("resize", positionIndicator);
    }
    const observer = new ResizeObserver(positionIndicator);
    observer.observe(root);
    return () => observer.disconnect();
  }, [options.length, selectedKey]);

  return (
    <div className={`${className} sliding-segmented`} ref={rootRef}>
      <span className="segmented-indicator" aria-hidden="true" ref={indicatorRef} />
      {options.map((option) => {
        const selected = option.value === value;
        const key = String(option.value);
        return (
          <button
            type="button"
            key={key}
            ref={(node) => {
              if (node) buttonRefs.current.set(key, node);
              else buttonRefs.current.delete(key);
            }}
            className={selected ? "selected" : ""}
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {selected ? option.selectedLabel ?? option.label : option.label}
          </button>
        );
      })}
    </div>
  );
}
