"use client";

import Link from "next/link";
import { Check, ChevronDown, Crosshair, Swords, Target } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useClickOutside } from "@/frontend/hooks/use-click-outside";

const games = [
  { href: "/valorant", name: "VALORANT", icon: Crosshair },
  { href: "/league-of-legends", name: "League of Legends", icon: Swords },
  { href: "/cs2", name: "Counter-Strike 2", icon: Target },
] as const;

type GameSelectorProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function GameSelector({ open, onOpenChange }: GameSelectorProps) {
  const pathname = usePathname();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = useCallback((nextOpen: boolean) => {
    if (open === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange, open]);
  const currentGame = games.find((game) => pathname === game.href) ?? games[0];
  const CurrentIcon = currentGame.icon;
  useClickOutside(ref, isOpen, () => setOpen(false));

  return (
    <div className="game-selector" ref={ref}>
      <button
        type="button"
        className="game-selector-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="game-selector-menu"
        onClick={() => setOpen(!isOpen)}
      >
        <CurrentIcon size={15} aria-hidden="true" />
        <span>{currentGame.name}</span>
        <ChevronDown className={isOpen ? "open" : ""} size={14} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="game-selector-menu" id="game-selector-menu" role="menu">
          {games.map((game) => {
            const Icon = game.icon;
            const selected = game.href === currentGame.href;

            return (
              <Link
                key={game.href}
                className={`game-selector-option ${selected ? "selected" : ""}`}
                href={game.href}
                role="menuitem"
                aria-current={selected ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{game.name}</span>
                {selected ? <Check size={15} aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
