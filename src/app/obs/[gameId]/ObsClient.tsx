"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSocket } from "@/lib/socket-context";
import { Board } from "@/components/Board";
import { ParticipantTile } from "@/components/ParticipantTile";
import { TurnIndicator } from "@/components/TurnIndicator";
import { ChatOverlay } from "@/components/ChatOverlay";
import { StartingSoon } from "@/components/StartingSoon";
import { GameNotFound } from "@/components/GameNotFound";
import { WinnerToast } from "@/components/WinnerToast";
import { LiveKitRoomProvider } from "@/lib/livekit-context";
import type { ClientGameState } from "@/server/types";

interface Props {
  gameId: string;
  chatChannel?: string;
  hideCamera?: string;
  compact: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  lobby: "Warteraum",
  playing: "Spiel läuft",
  bonus_pending: "Bonus bereit",
  bonus_buzzing: "Bonus-Buzzer offen",
  finished: "Spiel beendet",
};

function BroadcastQuestionImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div className="flex aspect-video min-h-0 items-center justify-center rounded-[1.1rem] border border-red-400/40 bg-red-950/40 px-4 text-center text-xs font-bold text-red-100/78">
        Bild konnte nicht geladen werden.
      </div>
    );
  }

  return (
    <div className="relative aspect-video min-h-0 overflow-hidden rounded-[1.1rem] border border-amber-300/30 bg-emerald-950/70 shadow-lg shadow-black/25">
      <div className="absolute left-3 top-3 z-10 rounded-full border border-emerald-200/10 bg-emerald-950/78 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/78">
        {label}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

function ObsQuestionDisplay({
  game,
  stateLabel,
}: {
  game: ClientGameState;
  stateLabel: string;
}) {
  const activeQuestion = game.activeQuestion;
  const reviewQuestion = game.reviewQuestion;
  const currentQuestion = activeQuestion ?? reviewQuestion;
  if (!currentQuestion) return null;

  const q = currentQuestion.question;
  const isReview = Boolean(reviewQuestion && !activeQuestion);
  const isBonus = currentQuestion.category === "_bonus_buzzer";
  const categoryName = isBonus
    ? "Spezialprüfung"
    : game.categories.find((category) => category.id === currentQuestion.category)?.displayName ?? "Frage";
  const hasAnswer = Boolean(q.answer);
  const hasMedia = Boolean(q.imageUrl || q.answerImageUrl);

  return (
    <div className="surface-panel-strong shrink-0 overflow-hidden rounded-[1.6rem] px-5 py-4">
      <div
        className={[
          "grid min-h-0 gap-4",
          hasMedia ? "grid-cols-[minmax(0,1fr)_minmax(300px,42%)]" : "grid-cols-1",
        ].join(" ")}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="section-kicker">
              {isReview ? "Review" : categoryName} · {currentQuestion.points}
            </div>
            <div className="rounded-full border border-emerald-300/16 bg-emerald-950/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/76">
              {isReview ? "Auflösung" : stateLabel}
            </div>
          </div>
          <div className="mt-3 text-2xl font-black leading-tight text-amber-50">
            {q.prompt}
          </div>
          {hasAnswer ? (
            <div className="mt-4 rounded-2xl border border-amber-300/28 bg-amber-400/12 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/70">
                Antwort
              </div>
              <div className="mt-1 text-xl font-black leading-tight text-amber-100">
                {q.answer}
              </div>
            </div>
          ) : null}
        </div>

        {hasMedia ? (
          <div
            className={[
              "grid min-h-0 gap-3",
              q.imageUrl && q.answerImageUrl ? "grid-cols-2" : "grid-cols-1",
            ].join(" ")}
          >
            {q.imageUrl ? (
              <BroadcastQuestionImage src={q.imageUrl} label="Frage" />
            ) : null}
            {q.answerImageUrl ? (
              <BroadcastQuestionImage src={q.answerImageUrl} label="Antwort" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ObsClient({ gameId, chatChannel: requestedChatChannel, hideCamera, compact }: Props) {
  const { game, spectateGame, connected, lastJudgeResult } = useSocket();
  const [correctFlash, setCorrectFlash] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = () => void spectateGame(gameId).then((resp) => {
      if (cancelled) return;
      setNotFound(!resp.ok);
    });
    sync();
    const syncTimer = setInterval(sync, 5000);
    return () => {
      cancelled = true;
      clearInterval(syncTimer);
    };
  }, [gameId, spectateGame]);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBody = body.style.background;
    const prevHtml = html.style.background;
    body.style.background = "transparent";
    html.style.background = "transparent";
    return () => {
      body.style.background = prevBody;
      html.style.background = prevHtml;
    };
  }, []);

  useEffect(() => {
    if (!lastJudgeResult) return;
    if (lastJudgeResult.correct) {
      const enableTimer = setTimeout(() => setCorrectFlash(true), 0);
      const disableTimer = setTimeout(() => setCorrectFlash(false), 1600);
      return () => {
        clearTimeout(enableTimer);
        clearTimeout(disableTimer);
      };
    }

    const enableTimer = setTimeout(() => setWrongFlash(true), 0);
    const disableTimer = setTimeout(() => setWrongFlash(false), 1200);
    return () => {
      clearTimeout(enableTimer);
      clearTimeout(disableTimer);
    };
  }, [lastJudgeResult]);

  if (notFound) {
    return <GameNotFound code={gameId} />;
  }

  if (!game || !connected) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-emerald-700">
        Warte auf Spiel...
      </div>
    );
  }

  const hostPlayer = game.players[game.hostId];
  const contestants = game.playerOrder
    .filter((id) => id !== game.hostId)
    .map((id) => game.players[id])
    .filter((player): player is NonNullable<typeof player> => Boolean(player))
    .filter(
      (player) =>
        !hideCamera ||
        player.twitchLogin.toLowerCase() !== hideCamera.toLowerCase(),
    );
  const highScore = Math.max(0, ...contestants.map((player) => player.score));
  const leaderId =
    highScore > 0
      ? contestants.find((player) => player.score === highScore)?.id
      : null;
  const chatChannel = requestedChatChannel || hostPlayer?.twitchLogin;
  const phaseLabel = PHASE_LABELS[game.phase] ?? game.phase;
  const boardStateLabel = game.activeQuestion
    ? game.activeQuestion.buzzersOpen
      ? "Buzzer offen"
      : game.activeQuestion.currentAnswerer
        ? `${game.players[game.activeQuestion.currentAnswerer]?.displayName ?? "?"} antwortet`
        : "Frage aktiv"
    : game.phase === "finished"
      ? "Ergebnis"
      : "Nächster Pick";
  const contestantCount = Math.max(contestants.length, 1);
  const contestantGap = compact ? 6 : 8;
  const maxContestantCameraHeight = compact ? 220 : 256;
  const contestantCameraWidth = `min(${
    (maxContestantCameraHeight * 16) / 9
  }px, calc((100vw - ${compact ? 28 : 36}px - ${
    (contestantCount - 1) * contestantGap
  }px) / ${contestantCount}))`;

  const flashOn = correctFlash || wrongFlash;
  const flashColor = correctFlash
    ? {
        shadow: "inset 0 0 140px 50px rgba(34,197,94,0.55)",
        border: "rgba(34,197,94,0.85)",
        bg: "rgba(34,197,94,0.04)",
      }
    : {
        shadow: "inset 0 0 100px 30px rgba(220,38,38,0.5)",
        border: "rgba(220,38,38,0.8)",
        bg: "rgba(220,38,38,0.04)",
      };

  return (
    <LiveKitRoomProvider gameId={gameId} publish={false}>
      <div
      className="quiz-shell flex h-screen w-screen flex-col overflow-hidden bg-[#0b0807] text-emerald-50"
      style={{ padding: compact ? "8px" : "10px", gap: compact ? "6px" : "8px" }}
    >
      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: compact ? "340px 1fr 210px" : "380px 1fr 230px",
          gap: compact ? "6px" : "8px",
        }}
      >
        <aside className="flex min-h-0 flex-col gap-2">
          <div className="surface-panel rounded-[1.6rem] p-3">
            <div className="section-kicker">Host</div>
            <div className="mt-3 aspect-video w-full shrink-0">
              {hostPlayer ? (
                <ParticipantTile
                  player={hostPlayer}
                  gameId={gameId}
                  isCurrentTurn={false}
                  isHost
                  variant="host"
                  showStats={false}
                />
              ) : (
                <div className="h-full w-full rounded-xl bg-emerald-950/45" />
              )}
            </div>
          </div>

          {chatChannel ? (
            <div className="surface-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="section-kicker">Chat</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/48">
                  {chatChannel}
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.2rem] bg-emerald-950/45">
                <ChatOverlay channel={chatChannel} />
              </div>
            </div>
          ) : null}
        </aside>

        <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="surface-panel min-h-0 flex-1 overflow-hidden rounded-[1.7rem] p-3">
            {game.phase === "lobby" ? (
              <StartingSoon game={game} />
            ) : (
              <Board game={game} />
            )}
          </div>

          {game.activeQuestion || game.reviewQuestion ? (
            <ObsQuestionDisplay game={game} stateLabel={boardStateLabel} />
          ) : null}
        </section>

        <aside className="flex min-h-0 flex-col gap-2">
          <div className="surface-panel-strong rounded-[1.6rem] p-4">
            <div className="flex items-center gap-3">
              <Image
                src="/naruto/shinobi-crest.png"
                alt="Shinobi Quiz Wappen"
                width={compact ? 56 : 64}
                height={compact ? 56 : 64}
                className="brand-mark"
                priority
              />
              <div>
                <div className="section-kicker">Broadcast</div>
                <div className="mt-1 text-lg font-black text-emerald-50">
                  Shinobi <span className="text-lime-200">Quiz</span>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-[1.6rem] p-4">
            <div className="section-kicker">Rangliste</div>
            <div className="mt-3">
              <TurnIndicator game={game} />
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-950/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/52">
                  Phase
                </div>
                <div className="mt-1 text-sm font-black text-emerald-50">
                  {phaseLabel}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-950/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/52">
                  Prüfung
                </div>
                <div className="mt-1 text-sm font-black text-emerald-50">
                  Runde {game.currentBoardIndex + 1}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-950/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/52">
                  Status
                </div>
                <div className="mt-1 text-sm font-black text-emerald-50">
                  {boardStateLabel}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="surface-panel shrink-0 overflow-hidden rounded-[1.6rem] p-2">
        <div
          className="flex min-h-0 justify-center overflow-hidden"
          style={{ gap: `${contestantGap}px` }}
        >
          {contestants.map((player) => (
            <div
              key={player.id}
              className="aspect-video shrink-0"
              style={{ width: contestantCameraWidth }}
            >
              <ParticipantTile
                player={player}
                gameId={gameId}
                isCurrentTurn={game.currentTurn === player.id}
                isHost={false}
                isLeader={player.id === leaderId}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none fixed inset-0 z-[70] rounded transition-opacity duration-300"
        style={{
          opacity: flashOn ? 1 : 0,
          boxShadow: flashOn ? flashColor.shadow : "none",
          border: `10px solid ${flashOn ? flashColor.border : "transparent"}`,
          backgroundColor: flashOn ? flashColor.bg : "transparent",
        }}
      />
      <WinnerToast game={game} />
      </div>
    </LiveKitRoomProvider>
  );
}
