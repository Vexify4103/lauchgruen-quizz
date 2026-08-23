"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket-context";
import { playBuzz } from "@/lib/sounds";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionAudio } from "@/components/QuestionAudio";
import { ScoringRules } from "@/components/ScoringRules";
import { correctMultiplierLabel } from "@/lib/scoring-rules";
import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
  isHost: boolean;
  myPlayerId?: string;
}

export function QuestionModal({ game, isHost, myPlayerId }: Props) {
  const { emit, buzzersOpenedAt } = useSocket();
  const [buzzPressed, setBuzzPressed] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastEnabledAt = useRef<number | null>(null);

  // Derived values — computed unconditionally (no hooks, just reads)
  const aq = game.activeQuestion;
  const q = aq?.question;
  const answerer = aq?.currentAnswerer ? game.players[aq.currentAnswerer] : null;
  const isBonusBuzzerQ = aq?.category === "_bonus_buzzer";
  const categoryName = isBonusBuzzerQ
    ? "Bonusrunde"
    : aq
      ? game.categories.find((c) => c.id === aq.category)?.displayName
      : "";
  const serverBuzzersOpen = aq?.buzzersOpen ?? false;
  const arming = Boolean(
    aq?.buzzersOpenedAt &&
      !serverBuzzersOpen &&
      (game.phase === "buzzing" || game.phase === "bonus_buzzing"),
  );
  const locallyOpen = arming && buzzersOpenedAt !== null && now >= buzzersOpenedAt;
  const buzzersOpen = serverBuzzersOpen || locallyOpen;
  const countdownMs =
    arming && buzzersOpenedAt !== null
      ? Math.max(0, buzzersOpenedAt - now)
      : 0;
  const answerRevealed = aq?.answerRevealed ?? false;
  const alreadyTried = myPlayerId ? (aq?.alreadyTried.includes(myPlayerId) ?? false) : true;
  const isAnswerer = aq?.currentAnswerer === myPlayerId;
  const me = myPlayerId ? game.players[myPlayerId] : null;
  const eligible =
    !isHost && !!me && buzzersOpen && !alreadyTried && !isAnswerer;

  // Reset answer reveal + buzz state when question changes
  const questionId = aq?.questionId ?? null;
  useEffect(() => {
    setShowAnswer(false);
    setBuzzPressed(false);
    lastEnabledAt.current = null;
  }, [questionId]);

  // Track buzzers-opened timestamp for reaction time
  useEffect(() => {
    if (buzzersOpen) {
      lastEnabledAt.current = buzzersOpenedAt ?? Date.now();
      setBuzzPressed(false);
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

  // Safe to bail now — all hooks are above
  if (!aq || !q) return null;
  const showBonusInstruction = Boolean(
    isBonusBuzzerQ && q.instruction && q.instruction !== q.prompt,
  );
  const pointMultiplier = correctMultiplierLabel(
    game.currentBoardIndex,
    isBonusBuzzerQ,
  );

  const handleBuzz = () => {
    if (!eligible || buzzPressed || lastEnabledAt.current === null) return;
    playBuzz();
    const reactionMs = Date.now() - lastEnabledAt.current;
    setBuzzPressed(true);
    emit("player:buzz", { clientReactionMs: reactionMs });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
        <div className="surface-panel-strong themed-scrollbar flex max-h-[94vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto border-lime-200/22 p-5 shadow-2xl shadow-black/45 sm:p-6">

          {/* Category + points badge */}
          <div className="text-center">
            <span className="quiz-status border-amber-200/24 bg-amber-300 text-emerald-950 shadow">
              {categoryName} · {q.points}
              {pointMultiplier ? ` ${pointMultiplier}` : ""}
            </span>
          </div>

          <ScoringRules
            boardIndex={game.currentBoardIndex}
            isBonus={isBonusBuzzerQ}
            compact
            className="justify-center rounded-lg"
          />

          {/* Prompt */}
          <div className="text-center">
            {showBonusInstruction ? (
              <div className="text-sm font-black uppercase text-lime-200/78">
                {q.instruction}
              </div>
            ) : null}
            <div className={`${showBonusInstruction ? "mt-3" : ""} text-2xl font-black leading-snug text-emerald-50`}>
              {q.prompt}
            </div>
          </div>

          {/* Image — 16:9 preview, click anywhere on it to toggle lightbox */}
          {q.imageUrl ? (
            <div className="px-4">
              <QuestionImage src={q.imageUrl} />
            </div>
          ) : null}

          {/* Audio — custom player so non-host users can click play even if
              the browser blocks autoplay */}
          {q.audioUrl ? <QuestionAudio src={q.audioUrl} /> : null}

          {/* ── Answer reveal ─────────────────────────────────────────────── */}
          {answerRevealed && q.answer ? (
            /* Revealed to everyone after host skips buzzers */
            <div className="rounded-lg border border-amber-300/35 bg-amber-300/10 px-5 py-4 text-center">
              <div className="text-xs uppercase font-bold text-amber-300/70 tracking-wider mb-1">
                🍯 Antwort
              </div>
              <div className="text-2xl font-extrabold text-amber-100">{q.answer}</div>
              {q.answerImageUrl ? (
                <div className="mt-4">
                  <QuestionImage src={q.answerImageUrl} />
                </div>
              ) : null}
              <div className="text-xs text-emerald-400/60 mt-2 animate-pulse">
                Zurück zum Spielfeld…
              </div>
            </div>
          ) : isHost && q.answer ? (
            /* Host-only toggle (anti-stream-snipe) */
            showAnswer ? (
              <div className="bg-amber-950/60 border border-amber-400/40 rounded-lg px-4 py-3 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase font-bold text-amber-300/60 tracking-wider mb-1">
                      🍯 Antwort
                    </div>
                    <div className="text-xl font-bold text-amber-100">{q.answer}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAnswer(false)}
                    className="text-amber-300/50 hover:text-amber-300 text-xs shrink-0 mt-0.5"
                  >
                    verbergen
                  </button>
                </div>
                {q.answerImageUrl ? <QuestionImage src={q.answerImageUrl} /> : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                className="quiz-button-secondary self-center min-h-10 px-5 py-2"
              >
                🔍 Antwort anzeigen
              </button>
            )
          ) : null}

          {/* ── Status row ── (hidden while answer is being revealed) */}
          {!answerRevealed ? (
            answerer ? (
              /* Someone is answering */
              <div className="text-center text-emerald-100 text-lg">
                {isAnswerer ? (
                  <span className="font-extrabold text-amber-300 text-xl">
                    Du bist dran!
                  </span>
                ) : (
                  <>
                    <span className="font-extrabold text-amber-300">
                      {answerer.displayName}
                    </span>{" "}
                    antwortet…
                  </>
                )}
              </div>
            ) : arming && !buzzersOpen ? (
              !isHost ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-300/45 bg-emerald-950 text-5xl font-black text-amber-300 shadow-2xl shadow-amber-400/20">
                    {Math.ceil(countdownMs / 1000)}
                  </div>
                  <div className="text-sm font-black uppercase tracking-[0.14em] text-amber-300">
                    Buzzer öffnet gleich
                  </div>
                </div>
              ) : (
                <div className="text-center text-amber-300 font-extrabold text-xl animate-pulse">
                  Buzzer armed...
                </div>
              )
            ) : buzzersOpen ? (
              /* Buzz phase */
              !isHost ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={!eligible || buzzPressed}
                    onClick={handleBuzz}
                    className={[
                      "w-36 h-36 rounded-full font-extrabold text-3xl transition-all border-4",
                      eligible && !buzzPressed
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 text-emerald-950 hover:scale-105 active:scale-95 shadow-2xl shadow-amber-400/60 animate-pulse"
                        : buzzPressed
                          ? "bg-emerald-600 border-emerald-300 text-white"
                          : "bg-emerald-950 border-emerald-800 text-emerald-700 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {buzzPressed ? "✓" : "BUZZ"}
                  </button>
                  {alreadyTried && !isAnswerer ? (
                    <div className="text-sm text-emerald-400/70">Diese Frage bereits versucht</div>
                  ) : eligible ? (
                    <div className="text-sm text-amber-300 font-bold animate-pulse">⚡ Buzzer offen!</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center text-emerald-300 font-extrabold text-xl animate-pulse">
                  🐻 BUZZER OFFEN — warte auf Buzzes…
                </div>
              )
            ) : (
              !isHost ? (
                <div className="text-center text-emerald-400/70 italic text-sm">
                  Warte auf Host…
                </div>
              ) : null
            )
          ) : null}

          {/* ── Host buttons ────────────────────────────────────────────── */}
          {isHost && !answerRevealed ? (
            game.phase === "bonus_pending" ? (
              /* Bonus round is staged, buzzers not open yet — host's talk window. */
              <div className="grid gap-3 border-t border-emerald-800 pt-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => emit("host:open_bonus_buzzers")}
                  className="flex-1 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-emerald-950 font-extrabold rounded-lg px-6 py-3 transition-colors text-lg shadow-lg shadow-amber-400/30"
                >
                  ⚡ Bonus-Buzzer öffnen
                </button>
                <button
                  type="button"
                  onClick={() => emit("host:cancel_bonus_buzz")}
                  className="bg-red-900/70 hover:bg-red-800 border border-red-700 text-red-200 font-bold rounded-lg px-4 py-3 text-sm transition-colors"
                >
                  ✕ Bonus überspringen
                </button>
              </div>
            ) : answerer ? (
              /* Judge buttons */
              <div className="grid gap-3 border-t border-emerald-800 pt-2 sm:grid-cols-2">
                {isBonusBuzzerQ ? (
                  <div className="sm:col-span-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Wenn die Person die Bonusfrage nicht weiss, kannst du den
                    Buzzer wieder öffnen oder mit Continue / Weiter direkt
                    zum Spiel zurückgehen.
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => emit("host:judge", { correct: true })}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold rounded-lg px-6 py-3 transition-colors text-lg shadow-lg shadow-emerald-500/30"
                >
                  ✓ Richtig
                </button>
                <button
                  type="button"
                  onClick={() => emit("host:judge", { correct: false })}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white font-extrabold rounded-lg px-6 py-3 transition-colors text-lg shadow-lg"
                >
                  {isBonusBuzzerQ ? "✗ Falsch" : "✗ Falsch → Buzzer"}
                </button>
                {isBonusBuzzerQ ? (
                  <>
                    <button
                      type="button"
                      onClick={() => emit("host:reopen_bonus_buzzers")}
                      className="rounded-lg bg-amber-500 px-6 py-3 text-base font-extrabold text-emerald-950 shadow-lg shadow-amber-400/20 transition-colors hover:bg-amber-400"
                    >
                      Weiß nicht → Buzzer wieder öffnen
                    </button>
                    <button
                      type="button"
                      onClick={() => emit("host:skip_bonus_answer")}
                      className="rounded-lg border border-emerald-700 bg-emerald-950 px-6 py-3 text-base font-extrabold text-emerald-200 transition-colors hover:border-amber-400/70 hover:text-amber-200"
                    >
                      Weiter ohne Punkte
                    </button>
                  </>
                ) : null}
              </div>
            ) : buzzersOpen ? (
              /* Buzzers-open phase — allow host to skip / force-resolve */
              <div className="grid gap-3 border-t border-emerald-800 pt-2 sm:grid-cols-2">
                {isBonusBuzzerQ ? (
                  <>
                    <button
                      type="button"
                      onClick={() => emit("host:force_resolve_bonus")}
                      className="bg-amber-600 hover:bg-amber-500 text-emerald-950 font-extrabold rounded-lg px-6 py-3 transition-colors text-base"
                      title="Einen bereits eingegangenen Buzz sofort auswerten."
                    >
                      Buzz jetzt auswerten
                    </button>
                    <button
                      type="button"
                      onClick={() => emit("host:cancel_bonus_buzz")}
                      className="rounded-lg border border-red-700 bg-red-950/70 px-6 py-3 text-base font-extrabold text-red-200 transition-colors hover:bg-red-900"
                    >
                      Niemand buzzert - Bonus überspringen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => emit("host:reveal_and_close")}
                    className="flex-1 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-amber-300 hover:text-amber-200 font-extrabold rounded-lg px-6 py-3 transition-colors text-base"
                  >
                    📖 Antwort zeigen &amp; Zug beenden
                  </button>
                )}
              </div>
            ) : null
          ) : null}
        </div>
      </div>
    </>
  );
}
