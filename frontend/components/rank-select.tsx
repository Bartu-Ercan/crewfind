import { ChevronDown, Shield } from "lucide-react";
import { useRef } from "react";

import { useClickOutside } from "@/frontend/hooks/use-click-outside";
import { RANKS, RANK_TIER_COLORS, rankParts } from "@/shared/ranks";

type RankSelectProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  open: boolean;
  onOpenChange: (id: string | null) => void;
  min?: number;
  max?: number;
};

type RankOption = {
  index: number;
  name: string;
  tier: string;
  division?: string;
  color: string;
};

const rankOptions: RankOption[] = RANKS.map((rank, index) => {
  const { tier, division } = rankParts(rank);
  return {
    index,
    name: rank,
    tier,
    division,
    color: RANK_TIER_COLORS[tier] ?? "#8a9690",
  };
});

const rankGroups = rankOptions.reduce<RankOption[][]>((groups, option) => {
  const group = groups.find((items) => items[0]?.tier === option.tier);
  if (group) group.push(option);
  else groups.push([option]);
  return groups;
}, []);

export function RankSelect({
  id,
  label,
  value,
  onChange,
  open,
  onOpenChange,
  min = 0,
  max = RANKS.length - 1,
}: RankSelectProps) {
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
                          {option.division ?? "R"}
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
