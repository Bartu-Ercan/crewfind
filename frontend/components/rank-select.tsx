import { ChevronDown } from "lucide-react";

import { RANKS } from "@/shared/ranks";

type RankSelectProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function RankSelect({
  label,
  value,
  onChange,
  min = 0,
  max = RANKS.length - 1,
}: RankSelectProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="select-wrap">
        <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
          {RANKS.map((rank, index) =>
            index >= min && index <= max ? (
              <option key={rank} value={index}>
                {rank}
              </option>
            ) : null,
          )}
        </select>
        <ChevronDown size={17} />
      </div>
    </label>
  );
}
