"use client";

import Image from "next/image";
import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
  compact?: boolean;
}

export function FinalResults({ game, compact = false }: Props) {
  const standings = game.playerOrder
    .filter((playerId) => playerId !== game.hostId)
    .map((playerId) => game.players[playerId])
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .sort((a, b) => b.score - a.score);
  const winner = game.winnerId ? game.players[game.winnerId] : standings[0];

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-4 py-5 text-center">
      <Image
        src="/bear-logo.png"
        alt=""
        width={compact ? 62 : 78}
        height={compact ? 62 : 78}
        className="brand-mark"
      />
      <div className="section-kicker mt-3">Quiz beendet</div>
      <h2 className={`${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"} font-black text-amber-50`}>
        {winner ? `${winner.displayName} gewinnt` : "Endstand"}
      </h2>
      {winner ? (
        <div className="mt-1 text-sm font-bold text-lime-200">
          {winner.score} Punkte
        </div>
      ) : null}

      <div className={`mt-5 grid w-full max-w-xl gap-2 ${compact ? "text-sm" : "text-base"}`}>
        {standings.map((player, index) => (
          <div
            key={player.id}
            className={[
              "grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-b px-2 py-2 text-left",
              player.id === game.winnerId
                ? "border-lime-300/35 bg-lime-400/8 text-lime-50"
                : "border-white/8 text-emerald-100/78",
            ].join(" ")}
          >
            <span className="font-mono text-xs font-black text-lime-200/78">
              #{index + 1}
            </span>
            <span className="truncate font-black">{player.displayName}</span>
            <span className="font-mono font-black tabular-nums text-amber-100">
              {player.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
