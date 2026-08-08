"use client";

import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
}

export function TurnIndicator({ game }: Props) {
  const turnPlayer = game.currentTurn ? game.players[game.currentTurn] : null;

  return (
    <div className="quiz-status border-orange-300/18 bg-orange-400/[0.06] text-center shadow-lg">
      <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-100/42">
        Zug
      </span>
      {turnPlayer ? (
        <span className="max-w-[150px] truncate text-sm font-extrabold normal-case text-lime-100">
          {turnPlayer.displayName}
        </span>
      ) : (
        <span className="text-sm italic text-emerald-600">-</span>
      )}
    </div>
  );
}
