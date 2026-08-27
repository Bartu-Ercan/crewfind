"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import {
  QUEUE_TYPES,
  VALORANT_SERVERS,
  queueLabel,
  type QueueType,
  type ValorantServer,
} from "@/shared/queue-filters";

type QueueSelectorProps = {
  server: ValorantServer;
  queueType: QueueType;
  onChange: (filters: { server: ValorantServer; queueType: QueueType }) => void;
};

export function QueueSelector({ server, queueType, onChange }: QueueSelectorProps) {
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
        aria-label={`Sunucu ve kuyruk: ${queueLabel(server, queueType)}`}
        onClick={() => setOpen((value) => !value)}
      >
        <MapPin size={15} aria-hidden="true" />
        <span className="queue-selector-trigger-label">
          <strong>{VALORANT_SERVERS.find((option) => option.value === server)?.label}</strong>
          <small>{QUEUE_TYPES.find((option) => option.value === queueType)?.label}</small>
        </span>
        <ChevronDown className={open ? "open" : ""} size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="queue-selector-menu" id={menuId} role="menu">
          <div className="queue-selector-group">
            <span>VALORANT sunucusu</span>
            <div className="queue-server-grid">
              {VALORANT_SERVERS.map((option) => {
                const selected = option.value === server;
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={selected ? "queue-server-option selected" : "queue-server-option"}
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onChange({ server: option.value, queueType });
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

          <div className="queue-selector-group">
            <span>Kuyruk</span>
            <div className="queue-mode-picker">
              {QUEUE_TYPES.map((option) => {
                const selected = option.value === queueType;
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={selected ? "queue-mode-option selected" : "queue-mode-option"}
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onChange({ server, queueType: option.value });
                      setOpen(false);
                    }}
                  >
                    {option.label}
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
