import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { getGame } from "@/server/game-state";
import { LobbyClient } from "./LobbyClient";

function LobbyLoginGate({ gameId, playerCount }: { gameId: string; playerCount: number }) {
  return (
    <main className="quiz-shell flex min-h-screen items-center justify-center bg-[#0b0807] px-5 py-10 text-emerald-50">
      <section className="surface-panel-strong w-full max-w-lg overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-4 border-b border-white/8 pb-5">
          <Image
            src="/naruto/shinobi-crest.png"
            alt="Lauchgruen Shinobi Quiz"
            width={58}
            height={58}
            className="brand-mark"
            priority
          />
          <div>
            <div className="section-kicker">Einladung erkannt</div>
            <h1 className="mt-2 text-2xl font-black text-emerald-50">
              Zur Lobby anmelden
            </h1>
          </div>
        </div>

        <div className="py-7 text-center">
          <div className="quiz-status border-lime-200/20 text-lime-100/76">
            <span className="quiz-live-dot" /> Lobby-Code gültig
          </div>
          <div className="mt-4 font-mono text-4xl font-black text-orange-200 sm:text-5xl">
            {gameId}
          </div>
          <p className="mt-4 text-sm leading-6 text-emerald-100/58">
            {playerCount > 0
              ? `${playerCount} Teilnehmer warten bereits in dieser Lobby.`
              : "Diese Lobby wartet auf ihre ersten Teilnehmer."}
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("twitch", { redirectTo: `/lobby/${gameId}` });
          }}
        >
          <button type="submit" className="quiz-button-primary w-full py-3 text-sm">
            Mit Twitch anmelden und beitreten
          </button>
        </form>

        <Link
          href="/"
          className="mt-4 block text-center text-xs font-bold text-emerald-100/42 transition hover:text-lime-100"
        >
          Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId: rawGameId } = await params;
  const gameId = rawGameId.trim().toUpperCase();

  if (rawGameId !== gameId) {
    redirect(`/lobby/${encodeURIComponent(gameId)}`);
  }

  const game = getGame(gameId);
  if (!game) {
    redirect(`/?error=game_not_found&code=${encodeURIComponent(gameId)}`);
  }

  const session = await auth();
  if (!session?.user) {
    const playerCount = game.playerOrder.filter((playerId) => playerId !== game.hostId).length;
    return <LobbyLoginGate gameId={gameId} playerCount={playerCount} />;
  }

  return (
    <LobbyClient
      gameId={gameId}
      userId={session.user.id}
      isHost={false}
    />
  );
}
