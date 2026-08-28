"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useClickOutside } from "@/frontend/hooks/use-click-outside";
import {
  QUEUE_TYPES,
  VALORANT_SERVERS,
  queueLabel,
  queueSelectionLabel,
  serverSelectionLabel,
  type QueueType,
  type ValorantServer,
} from "@/shared/queue-filters";

type QueueSelectorProps = {
  servers: ValorantServer[];
  queueTypes: QueueType[];
  onChange: (filters: { servers: ValorantServer[]; queueTypes: QueueType[] }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function toggleSelection<T>(values: T[], value: T) {
  if (!values.includes(value)) return [...values, value];
  return values.length === 1 ? values : values.filter((item) => item !== value);
}

export function QueueSelector({
  servers,
  queueTypes,
  onChange,
  open,
  onOpenChange,
}: QueueSelectorProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = useCallback((nextOpen: boolean) => {
    if (open === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange, open]);
  const menuId = "queue-selector-menu";
  useClickOutside(ref, isOpen, () => setOpen(false));

  return (
    <div className="queue-selector" ref={ref}>
      <button
        type="button"
        className="queue-selector-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Sunucu ve kuyruk: ${queueLabel(servers, queueTypes)}`}
        onClick={() => setOpen(!isOpen)}
      >
        <MapPin size={15} aria-hidden="true" />
        <span className="queue-selector-trigger-label">
          <strong>{serverSelectionLabel(servers)}</strong>
          <small>{queueSelectionLabel(queueTypes)}</small>
        </span>
        <ChevronDown className={isOpen ? "open" : ""} size={14} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="queue-selector-menu" id={menuId} role="menu">
          <div className="queue-selector-group">
            <span>VALORANT sunucusu</span>
            <div className="queue-server-grid">
              {VALORANT_SERVERS.map((option) => {
                const selected = servers.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={selected ? "queue-server-option selected" : "queue-server-option"}
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    onClick={() =>
                      onChange({ servers: toggleSelection(servers, option.value), queueTypes })
                    }
                  >
                    <span>{option.label}</span>
                    {selected ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="queue-selector-group">
            <span>Kuyruk</span>
            <div className="queue-mode-picker">
              {QUEUE_TYPES.map((option) => {
                const selected = queueTypes.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={selected ? "queue-mode-option selected" : "queue-mode-option"}
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    onClick={() =>
                      onChange({ servers, queueTypes: toggleSelection(queueTypes, option.value) })
                    }
                  >
                    {option.label}
                    {selected ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
