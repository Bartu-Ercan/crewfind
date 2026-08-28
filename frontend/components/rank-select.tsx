import { ChevronDown, Shield } from "lucide-react";
import { useMemo, useRef } from "react";

import { useClickOutside } from "@/frontend/hooks/use-click-outside";
import type { RankOption } from "@/shared/game-config";

type RankSelectProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  open: boolean;
  onOpenChange: (id: string | null) => void;
  ranks: RankOption[];
  min?: number;
  max?: number;
};

type IndexedRankOption = RankOption & {
  index: number;
};

export function RankSelect({
  id,
  label,
  value,
  onChange,
  open,
  onOpenChange,
  ranks,
  min = 0,
  max = ranks.length - 1,
}: RankSelectProps) {
  const { rankOptions, rankGroups } = useMemo(() => {
    const options: IndexedRankOption[] = ranks.map((rank, index) => ({ ...rank, index }));
    const groups = options.reduce<IndexedRankOption[][]>((result, option) => {
      const group = result.find((items) => items[0]?.tier === option.tier);
      if (group) group.push(option);
      else result.push([option]);
      return result;
    }, []);
    return { rankOptions: options, rankGroups: groups };
  }, [ranks]);
  const selected = rankOptions[value] ?? rankOptions[0];
  const listboxId = `${id}-listbox`;
  const ref = useRef<HTMLDivElement>(null);
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
          <span
            className="rank-badge"
            style={{ backgroundColor: `${selected.color}33`, color: selected.color }}
            aria-hidden="true"
          >
            <Shield size={13} />
          </span>
          <span className="rank-trigger-text">{selected.name}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>

        {open && (
          <div className="rank-menu" id={listboxId} role="listbox">
            {rankGroups.map((group) => {
              const visibleOptions = group.filter(
                (option) => option.index >= min && option.index <= max,
              );
              if (!visibleOptions.length) return null;

              const tierColor = group[0]?.color ?? "#8a9690";
              return (
                <div className="rank-menu-row" key={group[0]?.tier}>
                  <span
                    className="rank-badge"
                    style={{ backgroundColor: `${tierColor}33`, color: tierColor }}
                    aria-hidden="true"
                  >
                    <Shield size={13} />
                  </span>
                  <span className="rank-tier">{group[0]?.tier}</span>
                  <div className="rank-chips">
                    {visibleOptions.map((option) => {
                      const selectedOption = option.index === value;
                      return (
                        <button
                          type="button"
                          key={option.index}
                          className={selectedOption ? "rank-chip selected" : "rank-chip"}
                          style={
                            selectedOption
                              ? { backgroundColor: option.color, color: "#ffffff" }
                              : { color: option.color }
                          }
                          role="option"
                          aria-selected={selectedOption}
                          onClick={() => {
                            onChange(option.index);
                            onOpenChange(null);
                          }}
                        >
                          {option.division ?? option.name.slice(0, 1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
