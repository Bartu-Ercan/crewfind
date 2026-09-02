"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GAME_ROUTES, type GameId } from "@/shared/game-config";

const shareCopy: Record<GameId, string> = {
  valorant: "VALORANT takımındaki eksik oyuncuyu CrewFind ile bul.",
  "league-of-legends": "League of Legends takım arkadaşını CrewFind ile bul.",
  cs2: "Counter-Strike 2 takımındaki eksik oyuncuyu CrewFind ile bul.",
};

export function ShareCrewFind({ game }: { game: GameId }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function share() {
    const url = `${window.location.origin}${GAME_ROUTES[game]}`;
    const payload = { title: "CrewFind", text: shareCopy[game], url };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${payload.text} ${url}`);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="share-site-button" type="button" onClick={() => void share()}>
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? "Bağlantı kopyalandı" : "CrewFind’i paylaş"}
    </button>
  );
}
