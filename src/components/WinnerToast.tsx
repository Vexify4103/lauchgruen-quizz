"use client";

import { useEffect, useState } from "react";
import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
  durationMs?: number;
}

export function WinnerToast({ game, durationMs = 6500 }: Props) {
  const [visible, setVisible] = useState(false);
  const winnerId = game.winnerId;
  const winner = winnerId ? game.players[winnerId] : null;

  useEffect(() => {
    if (game.phase !== "finished" || !winnerId) return;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, game.phase, winnerId]);

  if (game.phase !== "finished" || !winner || !visible) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-[85] w-[min(92vw,520px)] -translate-x-1/2">
      <div className="rounded-[1.5rem] border border-amber-300/50 bg-emerald-950/92 px-5 py-4 text-center shadow-2xl shadow-amber-500/20 backdrop-blur-md">
        <div className="section-kicker">Ergebnis</div>
        <div className="mt-1 text-2xl font-black leading-tight text-amber-200">
          {winner.displayName} gewinnt
        </div>
        <div className="mt-1 text-sm font-bold text-emerald-100/72">
          {winner.score} Punkte
        </div>
      </div>
    </div>
  );
}
