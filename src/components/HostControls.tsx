"use client";

import { useState } from "react";
import { useSocket } from "@/lib/socket-context";
import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
}

const PHASE_LABELS: Record<string, string> = {
  lobby: "Warteraum",
  playing: "Spiel läuft",
  bonus_pending: "Bonus bereit",
  bonus_buzzing: "Bonus-Buzzer offen",
  finished: "Spiel beendet",
};

export function HostControls({ game }: Props) {
  const { emit, lastBuzzWinner } = useSocket();
  const [scoreAdjustment, setScoreAdjustment] = useState(100);
  const activeQuestion = game.activeQuestion;
  const phase = game.phase;
  const phaseLabel = PHASE_LABELS[phase] ?? phase;
  const isBonusPending = phase === "bonus_pending";
  const isBonusBuzz = phase === "bonus_buzzing";
  const isBonusAnswering =
    game.isBonusRound &&
    activeQuestion?.category === "_bonus_buzzer" &&
    !!activeQuestion.currentAnswerer;
  const bonusWinnerPending =
    game.isBonusRound && !activeQuestion && phase === "playing" && game.currentTurn;
  const bonusWinnerName = bonusWinnerPending
    ? game.players[game.currentTurn!]?.displayName ?? "?"
    : null;
  const bonusAnswererName = activeQuestion?.currentAnswerer
    ? game.players[activeQuestion.currentAnswerer]?.displayName ?? "?"
    : null;

  const contestants = game.playerOrder
    .filter((pid) => pid !== game.hostId)
    .map((pid) => game.players[pid])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="surface-panel themed-scrollbar h-full overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <div className="section-kicker">Prüfungsleitung</div>
          <div className="mt-2 text-xl font-black text-emerald-50">Kontrollraum</div>
        </div>
        <span className="quiz-status"><span className="quiz-live-dot" /> {phaseLabel}</span>
      </div>
      <div className="mt-3 text-sm text-emerald-100/58">
        Aktuelle Phase: <span className="font-bold text-lime-200">{phaseLabel}</span>
        {game.isBonusRound ? (
          <span className="ml-2 rounded-full bg-amber-400/16 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200">
            Bonus
          </span>
        ) : null}
      </div>

      {isBonusPending ? (
        <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
            Bonus bereit
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => emit("host:open_bonus_buzzers")}
              className="quiz-button-primary w-full"
            >
              Bonus-Buzzer öffnen
            </button>
            <button
              type="button"
              onClick={() => emit("host:cancel_bonus_buzz")}
              className="quiz-button-danger w-full"
            >
              Bonus überspringen
            </button>
          </div>
        </div>
      ) : null}

      {isBonusBuzz ? (
        <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
            Bonus-Buzzer offen
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => emit("host:force_resolve_bonus")}
              className="quiz-button-primary w-full"
            >
              Buzz auswerten
            </button>
            <button
              type="button"
              onClick={() => emit("host:cancel_bonus_buzz")}
              className="quiz-button-danger w-full"
            >
              Niemand buzzert - Bonus überspringen
            </button>
          </div>
        </div>
      ) : null}

      {isBonusAnswering && bonusAnswererName ? (
        <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
            Bonus-Antwort
          </div>
          <div className="mt-2 text-lg font-black text-amber-100">
            {bonusAnswererName} ist dran
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-100/74">
            Wenn die Person die Antwort nicht weiss, kannst du die übrigen
            Teilnehmer buzzern lassen oder direkt ohne Punkte weitermachen.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => emit("host:reopen_bonus_buzzers")}
              className="quiz-button-primary w-full"
            >
              Andere Teilnehmer buzzern lassen
            </button>
            <button
              type="button"
              onClick={() => emit("host:skip_bonus_answer")}
              className="quiz-button-secondary w-full"
            >
              Bonus beenden
            </button>
          </div>
        </div>
      ) : null}

      {bonusWinnerPending && bonusWinnerName ? (
        <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
          <div className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
            Bonus-Gewinner
          </div>
          <div className="mt-2 text-lg font-black text-amber-100">
            {bonusWinnerName}
            {lastBuzzWinner && lastBuzzWinner.playerId === game.currentTurn ? (
              <span className="ml-2 text-xs font-medium text-amber-200/76">
                {lastBuzzWinner.reactionMs}ms
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-100/74">
            Wähle jetzt auf dem Prüfungsbrett die gewünschte Aufgabe für den nächsten Zug.
          </p>
        </div>
      ) : null}

      {activeQuestion ? (
        <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.025] p-4 text-sm text-emerald-100/64">
          {activeQuestion.buzzersOpen && !activeQuestion.currentAnswerer
            ? "Buzzer sind offen."
            : activeQuestion.currentAnswerer
              ? `Antwortet: ${game.players[activeQuestion.currentAnswerer]?.displayName ?? "?"}`
              : "Frage aktiv."}
        </div>
      ) : null}

      {game.boards.length > 1 ? (
        <div className="mt-5 border-t border-white/8 pt-4">
          <div className="section-kicker">Prüfungsrunden</div>
          <div className="mt-3 flex gap-2">
            {game.boards.map((board, idx) => {
              const isCurrent = idx === game.currentBoardIndex;
              const allUsed = board.board.every((cell) => cell.used);
              const canSwitch = !isCurrent && phase === "playing";
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canSwitch}
                  onClick={() => canSwitch && emit("host:switch_board", { index: idx })}
                  className={[
                    "flex-1 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                    isCurrent
                      ? "bg-amber-400 text-emerald-950"
                      : allUsed
                        ? "bg-emerald-950/40 text-emerald-700 line-through"
                        : canSwitch
                          ? "bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
                          : "bg-emerald-950/40 text-emerald-700",
                  ].join(" ")}
                >
                  Runde {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-white/8 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="section-kicker">Punktekorrektur</div>
            <div className="mt-1 text-xs text-emerald-100/48">
              Wird sofort auf den aktuellen Stand angewendet.
            </div>
          </div>
          <label className="shrink-0">
            <span className="sr-only">Korrekturwert</span>
            <input
              type="number"
              min={1}
              max={5000}
              step={50}
              value={scoreAdjustment}
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                if (Number.isFinite(value)) {
                  setScoreAdjustment(Math.min(5000, Math.max(1, Math.round(value))));
                }
              }}
              className="quiz-input h-10 w-24 px-3 text-right font-mono text-sm font-black tabular-nums"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2">
          {contestants.map((player) => (
            <div
              key={player.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-white/7 px-1 py-2 last:border-b-0"
            >
              <span className="truncate text-sm font-bold text-emerald-100/82">
                {player.displayName}
              </span>
              <span className="min-w-14 text-right font-mono text-sm font-black tabular-nums text-amber-100">
                {player.score}
              </span>
              <button
                type="button"
                onClick={() => emit("host:adjust_score", { playerId: player.id, delta: -scoreAdjustment })}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/24 bg-red-950/55 text-lg font-black text-red-200 transition-colors hover:bg-red-900"
                title={`${scoreAdjustment} Punkte abziehen`}
                aria-label={`${player.displayName} ${scoreAdjustment} Punkte abziehen`}
              >
                −
              </button>
              <button
                type="button"
                onClick={() => emit("host:adjust_score", { playerId: player.id, delta: scoreAdjustment })}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300/24 bg-emerald-950/55 text-lg font-black text-emerald-100 transition-colors hover:bg-emerald-900"
                title={`${scoreAdjustment} Punkte hinzufügen`}
                aria-label={`${player.displayName} ${scoreAdjustment} Punkte hinzufügen`}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-white/8 pt-4">
        <div className="section-kicker">Nächster Shinobi</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {contestants.map((player) => {
            const active = game.currentTurn === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => emit("host:set_turn", { playerId: player.id })}
                className={[
                  "rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                  active
                    ? "bg-amber-400 text-emerald-950"
                    : "bg-emerald-800 text-emerald-100 hover:bg-emerald-700",
                ].join(" ")}
              >
                {player.displayName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
