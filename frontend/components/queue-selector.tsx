"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useClickOutside } from "@/frontend/hooks/use-click-outside";
import { useDelayedHoverClose } from "@/frontend/hooks/use-delayed-hover-close";
import {
  CS2_MAPS,
  GAME_CONFIGS,
  optionLabel,
  selectionLabel,
  type GameId,
} from "@/shared/game-config";

type QueueSelectorProps = {
  disabled?: boolean;
  game: GameId;
  servers: string[];
  queueTypes: string[];
  maps: string[];
  onChange: (filters: { servers: string[]; queueTypes: string[]; maps: string[] }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function toggleSelection<T>(values: T[], value: T) {
  if (!values.includes(value)) return [...values, value];
  return values.length === 1 ? values : values.filter((item) => item !== value);
}

export function QueueSelector({
  disabled = false,
  game,
  servers,
  queueTypes,
  maps,
  onChange,
  open,
  onOpenChange,
}: QueueSelectorProps) {
  const config = GAME_CONFIGS[game];
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = useCallback((nextOpen: boolean) => {
    if (open === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange, open]);
  const menuId = "queue-selector-menu";
  const close = useCallback(() => setOpen(false), [setOpen]);
  const { closing, cancelClose, handlePointerEnter, handlePointerLeave } =
    useDelayedHoverClose(isOpen, close);
  useClickOutside(ref, isOpen, close);

  return (
    <div
      className="queue-selector"
      ref={ref}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        className="queue-selector-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-disabled={disabled}
        disabled={disabled}
        aria-label={`Sunucu ve kuyruk: ${selectionLabel(config.servers, servers, "Sunucu")} · ${selectionLabel(config.queues, queueTypes, "Kuyruk")}`}
        onClick={() => {
          cancelClose();
          setOpen(!isOpen);
        }}
      >
        <MapPin size={15} aria-hidden="true" />
        <span className="queue-selector-trigger-label">
          <strong>{selectionLabel(config.servers, servers, "Sunucu")}</strong>
          <small>
            {queueTypes.length === 1
              ? optionLabel(config.queues, queueTypes[0])
              : "Tüm kuyruklar"}
          </small>
        </span>
        <ChevronDown className={isOpen ? "open" : ""} size={14} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className={`queue-selector-menu ${closing ? "closing" : ""}`}
          id={menuId}
          role="menu"
        >
          <div className="queue-selector-group">
            <span>{config.serverGroupLabel}</span>
            <div className="queue-server-grid">
              {config.servers.map((option) => {
                const selected = servers.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={selected ? "queue-server-option selected" : "queue-server-option"}
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    onClick={() =>
                      onChange({
                        servers: config.serverSelection === "single"
                          ? [option.value]
                          : toggleSelection(servers, option.value),
                        queueTypes,
                        maps,
                      })
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
              {config.queues.map((option) => {
                const selected = queueTypes.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={selected ? "queue-mode-option selected" : "queue-mode-option"}
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    onClick={() =>
                      onChange({
                        servers,
                        queueTypes: config.queueSelection === "single"
                          ? [option.value]
                          : toggleSelection(queueTypes, option.value),
                        maps: game === "cs2" && option.value === "competitive"
                          ? (maps.length ? maps : CS2_MAPS.map((map) => map.value))
                          : game === "cs2" ? [] : maps,
                      })
                    }
                  >
                    {option.label}
                    {selected ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {game === "cs2" && queueTypes.includes("competitive") ? (
            <div className="queue-selector-group">
              <span>Haritalar</span>
              <div className="queue-map-grid">
                {CS2_MAPS.map((option) => {
                  const selected = maps.includes(option.value);
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={selected ? "queue-server-option selected" : "queue-server-option"}
                      role="menuitemcheckbox"
                      aria-checked={selected}
                      onClick={() => onChange({
                        servers,
                        queueTypes,
                        maps: toggleSelection(maps, option.value),
                      })}
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
      ) : null}
    </div>
  );
}
