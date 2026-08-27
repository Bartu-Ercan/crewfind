"use client";

import Link from "next/link";
import { Bomb, Check, ChevronDown, Crosshair, Swords } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const games = [
  { href: "/valorant", name: "VALORANT", icon: Crosshair },
  { href: "/league-of-legends", name: "League of Legends", icon: Swords },
  { href: "/cs2", name: "Counter-Strike 2", icon: Bomb },
] as const;

export function GameSelector() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentGame = games.find((game) => pathname === game.href) ?? games[0];
  const CurrentIcon = currentGame.icon;

  return (
    <div className="game-selector">
      <button
        type="button"
        className="game-selector-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="game-selector-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <CurrentIcon size={15} aria-hidden="true" />
        <span>{currentGame.name}</span>
        <ChevronDown className={open ? "open" : ""} size={14} aria-hidden="true" />
      </button>

      {open ? (
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
