"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import {
  QUEUE_TYPES,
  REGIONS,
  queueLabel,
  type QueueType,
  type Region,
} from "@/shared/queue-filters";

type QueueSelectorProps = {
  region: Region;
  queueType: QueueType;
  onChange: (filters: { region: Region; queueType: QueueType }) => void;
};

export function QueueSelector({ region, queueType, onChange }: QueueSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuId = "queue-selector-menu";

  return (
    <div className="queue-selector">
      <button
        type="button"
        className="queue-selector-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Bölge ve kuyruk: ${queueLabel(region, queueType)}`}
        onClick={() => setOpen((value) => !value)}
      >
        <MapPin size={15} aria-hidden="true" />
        <span>{queueLabel(region, queueType)}</span>
        <ChevronDown className={open ? "open" : ""} size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="queue-selector-menu" id={menuId} role="menu">
          <div className="queue-selector-group">
            <span>Bölge</span>
            {REGIONS.map((option) => {
              const selected = option.value === region;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={selected ? "queue-selector-option selected" : "queue-selector-option"}
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    onChange({ region: option.value, queueType });
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {selected ? <Check size={15} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="queue-selector-group">
            <span>Kuyruk</span>
            {QUEUE_TYPES.map((option) => {
              const selected = option.value === queueType;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={selected ? "queue-selector-option selected" : "queue-selector-option"}
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    onChange({ region, queueType: option.value });
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {selected ? <Check size={15} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
