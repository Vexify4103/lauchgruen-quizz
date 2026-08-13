"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket-context";
import { GameNotFound } from "@/components/GameNotFound";
import { LiveKitCameraSetup } from "@/components/LiveKitCameraSetup";
import { LiveKitRoomProvider } from "@/lib/livekit-context";
import { SiteVolumeControl } from "@/components/SiteVolumeControl";

interface Props {
  gameId: string;
  userId: string;
  isHost: boolean;
}

export function LobbyClient({ gameId, userId }: Props) {
  const router = useRouter();
  const { game, joinGame, connected, emit, wasKicked } = useSocket();
  const [codeCopied, setCodeCopied] = useState(false);
  const [obsCopied, setObsCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    let cancelled = false;
    void joinGame(gameId).then((resp) => {
      if (cancelled) return;
      setNotFound(!resp.ok);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, joinGame]);

  useEffect(() => {
    if (!game) return;
    if (game.phase === "lobby") return;
    if (game.hostId === userId) router.push(`/host/${gameId}`);
    else router.push(`/play/${gameId}`);
  }, [game, userId, gameId, router]);

  const isHost = game?.hostId === userId;
  const players = game
    ? game.playerOrder
        .map((id) => game.players[id])
        .filter((player): player is NonNullable<typeof player> => Boolean(player))
    : [];
  const contestants = players.filter((p) => p.id !== game?.hostId);
  const me = game?.players[userId];
  const allReady = contestants.length > 0 && contestants.every((p) => p.ready);
  const readyCount = contestants.filter((p) => p.ready).length;

  const moveContestant = (playerId: string, direction: -1 | 1) => {
    const currentIndex = contestants.findIndex((player) => player.id === playerId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= contestants.length) return;

    const nextOrder = contestants.map((player) => player.id);
    const [moved] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(nextIndex, 0, moved);
    emit("host:reorder_players", { playerOrder: nextOrder });
  };

  if (wasKicked) {
    return <GameNotFound code={gameId} reason="kicked" />;
  }
  if (notFound) {
    return <GameNotFound code={gameId} />;
  }

  return (
    <LiveKitRoomProvider gameId={gameId} publish={Boolean(me)}>
      <div className="quiz-shell min-h-screen bg-[#0b0807] px-5 py-6 text-emerald-50 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="surface-panel-strong p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-xs font-bold text-emerald-100/44 transition-colors hover:text-lime-100"
              >
                Zurück zur Startseite
              </Link>
              <div className="flex items-center gap-4">
                <Image
                  src="/naruto/shinobi-crest.png"
                  alt="Shinobi Quiz Wappen"
                  width={52}
                  height={52}
                  className="brand-mark"
                  priority
                />
                <div>
                  <div className="section-kicker">Versammlungsraum</div>
                  <h1 className="mt-1 text-2xl font-black text-emerald-50 sm:text-3xl">
                    Shinobi <span className="text-lime-200">Quiz</span>
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-emerald-100/72 sm:text-base">
                {isHost
                  ? "Stelle dein Team zusammen, teile den Prüfungscode und gib das Startsignal, sobald alle Shinobi bereit sind."
                  : "Du wurdest zu dieser Prüfung gerufen. Kamera verbinden, bereit melden und auf das Signal des Prüfungsleiters warten."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <div className="surface-panel rounded-[1.5rem] p-4">
                <div className="section-kicker">Prüfungscode</div>
                <div className="mt-2 font-mono text-3xl font-black text-lime-200">
                  {gameId}
                </div>
                <button
                  type="button"
                  onClick={() => copyText(gameId, setCodeCopied)}
                  className="quiz-button-secondary mt-3 min-h-9 px-3 py-2 text-[10px]"
                >
                  {codeCopied ? "Code kopiert" : "Code kopieren"}
                </button>
              </div>

              <div className="surface-panel rounded-[1.5rem] p-4">
                <div className="section-kicker">Status</div>
                <div className="mt-2 flex items-center gap-2 text-lg font-black text-emerald-50">
                  <span className={connected ? "quiz-live-dot" : "size-2 rounded-full bg-amber-300"} />
                  {connected ? "Verbunden" : "Verbinde..."}
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  {isHost
                    ? `${readyCount}/${contestants.length} eingeladene Spieler bereit`
                    : me?.ready
                      ? "Du bist startklar"
                      : "Warte auf Freigabe und markiere dich dann als bereit"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col gap-6">
            <div className="surface-panel rounded-[1.8rem] p-5 sm:p-6">
              <div className="section-kicker">Dein Platz im Team</div>
              <h2 className="mt-3 text-2xl font-black text-amber-100">
                Kamera wählen und Ausrüstung prüfen
              </h2>
              {me ? (
                <LiveKitCameraSetup player={me} gameId={gameId} />
              ) : (
                <p className="mt-4 text-sm text-emerald-300/68">
                  Verbinde zuerst mit der Lobby, damit deine Kamera starten kann.
                </p>
              )}
            </div>

            {isHost ? (
              <div className="surface-panel rounded-[1.8rem] p-5 sm:p-6">
                <div className="section-kicker">Host-Setup</div>
                <h2 className="mt-3 text-2xl font-black text-amber-100">
                  OBS-Quelle für den Stream
                </h2>
                <p className="mt-3 text-sm leading-6 text-emerald-100/74">
                  Kopiere die Browser-Quelle für dein Overlay und füge sie in OBS
                  als Browser Source mit 1920x1080 ein.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const params = me?.twitchLogin
                      ? `?chat=${encodeURIComponent(me.twitchLogin)}`
                      : "";
                    copyText(
                      `${window.location.origin}/obs/${gameId}${params}`,
                      setObsCopied,
                    );
                  }}
                  className="mt-5 inline-flex w-fit items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-950 shadow-lg shadow-amber-500/20 transition-transform hover:-translate-y-0.5"
                >
                  {obsCopied ? "OBS-URL kopiert" : "OBS-URL kopieren"}
                </button>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-300/12 bg-emerald-950/35 p-4">
                    <div className="section-kicker">1</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/72">
                      Neue Browser-Quelle in OBS anlegen.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/12 bg-emerald-950/35 p-4">
                    <div className="section-kicker">2</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/72">
                      Kopierte URL einfügen.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/12 bg-emerald-950/35 p-4">
                    <div className="section-kicker">3</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/72">
                      Auf 1920x1080 setzen und live nehmen.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="surface-panel rounded-[1.8rem] p-5 sm:p-6">
                  <div className="section-kicker">Dein OBS-Link</div>
                  <h2 className="mt-3 text-2xl font-black text-amber-100">
                    Browser-Quelle für deine Szene
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-emerald-100/74">
                    Kopiere deine persönliche OBS-URL. Darin wird dein eigener
                    Chat passend zur eingeloggten Twitch-Identität eingeblendet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const params = me?.twitchLogin
                        ? `?chat=${encodeURIComponent(me.twitchLogin)}`
                        : "";
                      copyText(
                        `${window.location.origin}/obs/${gameId}${params}`,
                        setObsCopied,
                      );
                    }}
                    className="mt-5 inline-flex w-fit items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-950 shadow-lg shadow-amber-500/20 transition-transform hover:-translate-y-0.5"
                  >
                    {obsCopied ? "OBS-URL kopiert" : "OBS-URL kopieren"}
                  </button>
                </div>

                <div className="surface-panel rounded-[1.8rem] p-5 sm:p-6">
                  <div className="section-kicker">Ablauf</div>
                  <h2 className="mt-3 text-2xl font-black text-amber-100">
                    Danach musst du nur noch warten
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-300/12 bg-emerald-950/35 p-4">
                      <div className="section-kicker">1</div>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/72">
                        Browser-Tab mit der Lobby offen lassen.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/12 bg-emerald-950/35 p-4">
                      <div className="section-kicker">2</div>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/72">
                        Auf bereit setzen, sobald alles passt.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/12 bg-emerald-950/35 p-4">
                      <div className="section-kicker">3</div>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/72">
                        Der Host startet die Runde automatisch für alle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            <div className="surface-panel-strong rounded-[1.8rem] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker">Teilnehmende Shinobi</div>
                  <h2 className="mt-3 text-2xl font-black text-amber-100">
                    Reihenfolge der Prüfung
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-300/18 bg-emerald-950/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/72">
                  {contestants.length}/5 Gäste
                </div>
              </div>

              {players.length === 0 ? (
                <p className="mt-5 text-sm text-emerald-300/68">Warte auf Spieler...</p>
              ) : (
                <ul className="mt-5 grid gap-3">
                  {players.map((p) => {
                    const isPlayerHost = p.id === game?.hostId;
                    const contestantIndex = contestants.findIndex(
                      (player) => player.id === p.id,
                    );
                    const isOffline = !p.connected;
                    const statusLabel = isPlayerHost
                      ? "Host"
                      : p.ready
                        ? "Bereit"
                        : isOffline
                          ? "Offline"
                          : "Nicht bereit";
                    const statusClass = isPlayerHost
                      ? "bg-amber-400 text-emerald-950"
                      : p.ready
                        ? "bg-emerald-300 text-emerald-950"
                        : isOffline
                          ? "bg-red-400/20 text-red-200"
                          : "bg-emerald-900/70 text-emerald-200";

                    return (
                      <li
                        key={p.id}
                        className={[
                          "flex items-center gap-4 rounded-2xl border p-4 transition-opacity",
                          isOffline
                            ? "border-emerald-900 bg-emerald-950/35 opacity-65"
                            : "border-emerald-300/12 bg-emerald-950/55",
                        ].join(" ")}
                      >
                        {p.avatarUrl ? (
                          <Image
                            src={p.avatarUrl}
                            alt={p.displayName}
                            width={46}
                            height={46}
                            className={[
                              "rounded-2xl border object-cover",
                              isOffline
                                ? "border-emerald-700/50 grayscale"
                                : "border-amber-400/35",
                            ].join(" ")}
                            unoptimized
                          />
                        ) : (
                          <div className="h-[46px] w-[46px] rounded-2xl bg-emerald-800" />
                        )}
                        {!isPlayerHost ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300/22 bg-amber-300/10 text-sm font-black text-amber-200">
                            {contestantIndex + 1}
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-black text-amber-100">
                            {p.displayName}
                          </div>
                          <div className="truncate text-xs text-emerald-300/62">
                            @{p.twitchLogin}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                        {isHost && !isPlayerHost ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveContestant(p.id, -1)}
                              disabled={contestantIndex <= 0}
                              title="Eine Position nach vorne"
                              aria-label={`${p.displayName} eine Position nach vorne`}
                              className="h-8 w-8 rounded-full border border-emerald-300/18 bg-emerald-950/55 text-sm font-black text-emerald-100 transition-colors hover:border-amber-300/35 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveContestant(p.id, 1)}
                              disabled={contestantIndex < 0 || contestantIndex >= contestants.length - 1}
                              title="Eine Position nach hinten"
                              aria-label={`${p.displayName} eine Position nach hinten`}
                              className="h-8 w-8 rounded-full border border-emerald-300/18 bg-emerald-950/55 text-sm font-black text-emerald-100 transition-colors hover:border-amber-300/35 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`${p.displayName} aus der Lobby entfernen?`)) {
                                  emit("host:kick_player", { playerId: p.id });
                                }
                              }}
                              title="Spieler entfernen"
                              aria-label={`${p.displayName} entfernen`}
                              className="h-8 w-8 rounded-full bg-red-900/50 text-sm font-extrabold text-red-200 transition-colors hover:bg-red-700 hover:text-white"
                            >
                              x
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="surface-panel rounded-[1.8rem] p-5 sm:p-6">
              <div className="section-kicker">{isHost ? "Startfreigabe" : "Bereitschaft"}</div>
              <h2 className="mt-3 text-2xl font-black text-amber-100">
                {isHost ? "Starten, sobald alle bereit sind" : "Melde dich startklar"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-emerald-100/74">
                {isHost
                  ? `Aktuell sind ${readyCount} von ${contestants.length} eingeladenen Spielern bereit.`
                  : me?.ready
                    ? "Du bist als bereit markiert und wirst automatisch in die Runde geschickt."
                    : "Wenn Kamera und Setup passen, markiere dich als bereit."}
              </p>

              {!isHost ? <SiteVolumeControl /> : null}

              {isHost ? (
                <button
                  type="button"
                  onClick={() => emit("host:start_game")}
                  disabled={!allReady}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-6 py-4 text-base font-black text-emerald-950 shadow-lg shadow-amber-500/20 transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-emerald-800 disabled:to-emerald-900 disabled:text-emerald-600"
                >
                  {allReady ? "Spiel starten" : `Warte auf Spieler (${readyCount}/${contestants.length})`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => emit("player:set_ready", { ready: !me?.ready })}
                  className={[
                    "mt-5 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-black transition-colors",
                    me?.ready
                      ? "bg-emerald-500 text-white hover:bg-emerald-400"
                      : "bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-emerald-950 hover:from-amber-200 hover:to-orange-300",
                  ].join(" ")}
                >
                  {me?.ready ? "Als bereit markiert" : "Jetzt bereit"}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
      </div>
    </LiveKitRoomProvider>
  );
}
