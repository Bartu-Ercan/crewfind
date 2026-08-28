import { Check, ChevronDown, Shield } from "lucide-react";
import { useRef } from "react";

import { useClickOutside } from "@/frontend/hooks/use-click-outside";
import type { RatingBand } from "@/shared/game-config";

type RatingSelectProps = {
  id: string;
  label: string;
  value: number;
  bands: RatingBand[];
  max?: number;
  open: boolean;
  onOpenChange: (id: string | null) => void;
  onChange: (value: number) => void;
};

export function RatingSelect({
  id,
  label,
  value,
  bands,
  max = Number.POSITIVE_INFINITY,
  open,
  onOpenChange,
  onChange,
}: RatingSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = bands.find((band) => band.value === value) ?? bands[0];
  const listboxId = `${id}-listbox`;
  useClickOutside(ref, open, () => onOpenChange(null));

  return (
    <div className="field rank-field">
      <span>{label}</span>
      <div className="rank-select" ref={ref}>
        <button
          type="button"
          className="rank-trigger"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => onOpenChange(open ? null : id)}
        >
          <span className="rank-badge" style={{ backgroundColor: `${selected.color}33`, color: selected.color }} aria-hidden="true">
            <Shield size={13} />
          </span>
          <span className="rank-trigger-text">{selected.label}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>

        {open ? (
          <div className="rank-menu rating-menu" id={listboxId} role="listbox">
            {bands.filter((band) => band.value <= max).map((band) => {
              const isSelected = band.value === selected.value;
              return (
                <button
                  type="button"
                  className={isSelected ? "rating-band-option selected" : "rating-band-option"}
                  key={band.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(band.value);
                    onOpenChange(null);
                  }}
                >
                  <span className="rating-band-mark" style={{ backgroundColor: band.color }} aria-hidden="true" />
                  <span style={{ color: band.color }}>{band.label}</span>
                  {isSelected ? <Check size={15} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
