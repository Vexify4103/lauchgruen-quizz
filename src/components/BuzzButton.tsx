"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket-context";
import { playBuzz } from "@/lib/sounds";

interface Props {
  myPlayerId: string;
}

export function BuzzButton({ myPlayerId }: Props) {
  const { game, emit, buzzersOpenedAt, lastBuzzWinner } = useSocket();
  const [pressed, setPressed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastEnabledAt = useRef<number | null>(null);

  const isBonusBuzz   = game?.phase === "bonus_buzzing";
  // Buzzers are open during a regular buzz phase OR a bonus-buzz phase.
  const serverBuzzersOpen = game?.activeQuestion?.buzzersOpen ?? false;
  const arming = Boolean(
    game?.activeQuestion?.buzzersOpenedAt &&
      !serverBuzzersOpen &&
      (game.phase === "buzzing" || game.phase === "bonus_buzzing"),
  );
  const locallyOpen = arming && buzzersOpenedAt !== null && now >= buzzersOpenedAt;
  const buzzersOpen = serverBuzzersOpen || locallyOpen;
  const countdownMs =
    arming && buzzersOpenedAt !== null
      ? Math.max(0, buzzersOpenedAt - now)
      : 0;
  const alreadyTried  = game?.activeQuestion?.alreadyTried.includes(myPlayerId) ?? false;
  const isAnswerer    = game?.activeQuestion?.currentAnswerer === myPlayerId;
  const player        = game?.players[myPlayerId];

  const eligible =
    !!player &&
    buzzersOpen &&
    (isBonusBuzz ? true : !alreadyTried && !isAnswerer);

  useEffect(() => {
    if (buzzersOpen) {
      lastEnabledAt.current = buzzersOpenedAt ?? Date.now();
      setPressed(false);
    } else {
      lastEnabledAt.current = null;
    }
  }, [buzzersOpen, buzzersOpenedAt]);

  useEffect(() => {
    if (!arming) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 40);
    return () => clearInterval(timer);
  }, [arming]);

  const handleBuzz = () => {
    if (!eligible || pressed || lastEnabledAt.current === null) return;
    playBuzz();
    const reactionMs = Date.now() - lastEnabledAt.current;
    setPressed(true);
    emit("player:buzz", { clientReactionMs: reactionMs });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {isBonusBuzz && (
        <div className="text-xs font-extrabold text-amber-300 uppercase tracking-widest animate-pulse">
          Bonusrunde
        </div>
      )}
      <button
        type="button"
        disabled={!eligible || pressed}
        onClick={handleBuzz}
        className={[
          "w-44 h-44 rounded-full font-extrabold text-4xl transition-all border-4",
          eligible && !pressed
            ? isBonusBuzz
              ? "bg-gradient-to-br from-amber-300 to-lime-500 border-amber-200 text-emerald-950 hover:scale-105 active:scale-95 shadow-2xl shadow-lime-400/60 animate-pulse-slow"
              : "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 text-emerald-950 hover:scale-105 active:scale-95 shadow-2xl shadow-amber-400/60 animate-pulse-slow"
            : pressed
              ? "bg-emerald-600 border-emerald-300 text-white"
              : "bg-emerald-950 border-emerald-800 text-emerald-700 cursor-not-allowed",
        ].join(" ")}
      >
        {arming && !buzzersOpen ? Math.ceil(countdownMs / 1000) : "BUZZ"}
      </button>
      {arming && !buzzersOpen ? (
        <div className="text-sm font-black uppercase tracking-[0.14em] text-amber-300">
          Buzzer öffnet gleich
        </div>
      ) : null}
      {!isBonusBuzz && alreadyTried ? (
        <div className="text-sm text-emerald-400/70">Bereits versucht</div>
      ) : null}
      {lastBuzzWinner ? (
        lastBuzzWinner.playerId === myPlayerId ? (
          <div className="text-sm text-amber-300 font-bold">
            Du hast gebuzzert! ({lastBuzzWinner.reactionMs}ms)
          </div>
        ) : (
          <div className="text-sm text-emerald-300/80">
            {game?.players[lastBuzzWinner.playerId]?.displayName ?? "?"} war zuerst
            <span className="text-emerald-500/70 ml-1">
              ({lastBuzzWinner.reactionMs}ms)
            </span>
          </div>
        )
      ) : null}
    </div>
  );
}
