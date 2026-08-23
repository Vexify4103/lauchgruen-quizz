"use client";

import { useState } from "react";
import { useSocket } from "@/lib/socket-context";
import { correctMultiplierLabel } from "@/lib/scoring-rules";
import { ScoringRules } from "@/components/ScoringRules";
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

const SCORE_STEP = 50;

function clampScoreAdjustment(value: number): number {
  return Math.min(5000, Math.max(0, Math.round(value)));
}

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

  const changeScoreAdjustment = (delta: number) => {
    setScoreAdjustment((current) => clampScoreAdjustment(current + delta));
  };

  return (
    <div className="surface-panel themed-scrollbar h-full min-w-0 overflow-x-hidden overflow-y-auto p-4">
      <div className="border-b border-white/8 pb-4">
        <div className="min-w-0">
          <div className="section-kicker">Spielleitung</div>
          <div className="mt-1 text-lg font-black text-emerald-50">
            Kontrollraum
          </div>
          <span className="quiz-status mt-3 max-w-full justify-center text-center leading-tight">
            <span className="quiz-live-dot" /> {phaseLabel}
          </span>
        </div>
        {game.isBonusRound ? (
          <div className="mt-3 rounded-lg border border-amber-300/18 bg-amber-300/[0.07] px-3 py-2 text-center text-[10px] font-black uppercase text-amber-200">
            Bonusrunde aktiv
          </div>
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
            Wähle jetzt auf dem Spielbrett die gewünschte Frage für den nächsten Zug.
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
          <div className="section-kicker">Spielbretter</div>
          <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Spielbrett auswählen">
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
                    "min-w-0 rounded-lg px-1 py-2 text-center text-xs font-black transition-colors",
                    isCurrent
                      ? "bg-amber-400 text-emerald-950"
                      : allUsed
                        ? "bg-emerald-950/40 text-emerald-700 line-through"
                        : canSwitch
                          ? "bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
                          : "bg-emerald-950/40 text-emerald-700",
                  ].join(" ")}
                >
                  <span className="block text-[9px] uppercase text-current/65">Brett</span>
                  <span className="mt-0.5 block tabular-nums">
                    {idx + 1}
                    {correctMultiplierLabel(idx) ? ` ${correctMultiplierLabel(idx)}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <ScoringRules
            boardIndex={game.currentBoardIndex}
            isBonus={game.isBonusRound}
            compact
            className="mt-3 rounded-lg"
          />
        </div>
      ) : null}

      <div className="mt-5 border-t border-white/8 pt-4">
        <div className="section-kicker">Punktekorrektur</div>
        <p className="mt-1 text-xs leading-5 text-emerald-100/48">
          Direkte Korrektur ohne Brett-Multiplikator.
        </p>

        <div className="mt-3 rounded-lg border border-emerald-300/10 bg-emerald-950/35 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="score-adjustment" className="text-[10px] font-black uppercase text-emerald-200/60">
              Betrag pro Klick
            </label>
            <span className="text-[10px] font-bold text-emerald-100/40">0–5000</span>
          </div>
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] gap-1.5">
            <button
              type="button"
              disabled={scoreAdjustment === 0}
              onClick={() => changeScoreAdjustment(-SCORE_STEP)}
              className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-black/18 text-base font-black text-emerald-100 transition-colors hover:border-lime-300/25 hover:bg-lime-400/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
              title={`Korrekturwert um ${SCORE_STEP} verringern`}
              aria-label={`Korrekturwert um ${SCORE_STEP} verringern`}
            >
              −
            </button>
            <input
              id="score-adjustment"
              type="number"
              min={0}
              max={5000}
              step={50}
              value={scoreAdjustment}
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                if (Number.isFinite(value)) {
                  setScoreAdjustment(clampScoreAdjustment(value));
                }
              }}
              className="quiz-input score-adjustment-input h-9 min-w-0 w-full px-2 text-center font-mono text-sm font-black tabular-nums"
            />
            <button
              type="button"
              onClick={() => changeScoreAdjustment(SCORE_STEP)}
              className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-black/18 text-base font-black text-emerald-100 transition-colors hover:border-lime-300/25 hover:bg-lime-400/[0.08]"
              title={`Korrekturwert um ${SCORE_STEP} erhöhen`}
              aria-label={`Korrekturwert um ${SCORE_STEP} erhöhen`}
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {contestants.map((player) => (
            <div
              key={player.id}
              className="min-w-0 rounded-lg border border-white/7 bg-white/[0.025] p-2.5"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-emerald-100/82">
                  {player.displayName}
                </span>
                <span className="shrink-0 font-mono text-sm font-black tabular-nums text-amber-100">
                  {player.score}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={scoreAdjustment === 0}
                  onClick={() => emit("host:adjust_score", { playerId: player.id, delta: -scoreAdjustment })}
                  className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-red-400/24 bg-red-950/55 px-2 text-xs font-black tabular-nums text-red-200 transition-colors hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-35"
                  title={`${scoreAdjustment} Punkte abziehen`}
                  aria-label={`${player.displayName} ${scoreAdjustment} Punkte abziehen`}
                >
                  <span className="text-base">−</span> {scoreAdjustment}
                </button>
                <button
                  type="button"
                  disabled={scoreAdjustment === 0}
                  onClick={() => emit("host:adjust_score", { playerId: player.id, delta: scoreAdjustment })}
                  className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-emerald-300/24 bg-emerald-950/55 px-2 text-xs font-black tabular-nums text-emerald-100 transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-35"
                  title={`${scoreAdjustment} Punkte hinzufügen`}
                  aria-label={`${player.displayName} ${scoreAdjustment} Punkte hinzufügen`}
                >
                  <span className="text-base">+</span> {scoreAdjustment}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-white/8 pt-4">
        <div className="section-kicker">Nächster Gast</div>
        <div className="mt-3 grid min-w-0 gap-1.5">
          {contestants.map((player) => {
            const active = game.currentTurn === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => emit("host:set_turn", { playerId: player.id })}
                className={[
                  "min-w-0 truncate rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors",
                  active
                    ? "bg-amber-400 text-emerald-950"
                    : "bg-emerald-800 text-emerald-100 hover:bg-emerald-700",
                ].join(" ")}
              >
                <span className="mr-2 inline-block size-1.5 rounded-full bg-current opacity-60" />
                {player.displayName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
