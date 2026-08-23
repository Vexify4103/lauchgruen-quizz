import Image from "next/image";
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import { CreateGameButton } from "@/components/CreateGameButton";
import { JoinGameForm } from "@/components/JoinGameForm";

const ALLOWED_HOSTS = ["lauchgruen", "vexi_fy"];
const VEXIFY_URL = "https://twitch.tv/vexi_fy";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const canHost = ALLOWED_HOSTS.includes(session?.user?.twitchLogin ?? "");
  const errorMessage =
    sp.error === "game_not_found"
      ? `Spiel ${sp.code ? `"${sp.code}"` : ""} existiert nicht oder wurde beendet.`
      : null;

  return (
    <div className="quiz-shell flex min-h-screen flex-col bg-[#04110b] text-emerald-50">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-lime-500 px-4 py-3 text-xs font-black uppercase text-lime-50 shadow-xl transition focus:translate-y-0"
      >
        Zum Inhalt
      </a>

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#04110b]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="quiz-brand min-w-0">
            <Image
              src="/bear-logo.png"
              alt="Lauchgruen Quiz"
              width={48}
              height={48}
              className="brand-mark"
              priority
            />
            <span className="min-w-0">
              <span className="section-kicker block">Lauchgruen</span>
              <span className="mt-1 block truncate text-base font-black text-emerald-50">
                Allgemeinwissen Quiz
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="quiz-status hidden sm:inline-flex">
              <span className="quiz-live-dot" /> Live-Quizshow
            </span>
            <a
              href="https://lauchgruen.de"
              className="quiz-button-secondary min-h-10 px-3"
            >
              Hauptseite
            </a>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-5 py-6 sm:px-8 sm:py-10 lg:grid-cols-12"
      >
        <section className="knowledge-hero surface-panel-strong relative overflow-hidden p-6 sm:p-8 lg:col-span-7 lg:p-10">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300" />
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="quiz-status border-lime-300/20 bg-lime-400/[0.08] text-lime-100/75">
                <span className="quiz-live-dot" /> Gleich geht es los
              </span>
              <span className="font-mono text-xs font-black text-emerald-100/25">
                LG / QUIZ
              </span>
            </div>

            <div className="my-auto py-10 sm:py-14">
              <div className="section-kicker text-cyan-100/50">
                Wissen · Buzzer · Punkte
              </div>
              <h1 className="quiz-display quiz-wordmark mt-4 max-w-full text-2xl font-black leading-[0.98] sm:max-w-[14ch] sm:text-5xl">
                Lauchgruen <strong>Allgemeinwissen</strong>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-100/58">
                Drei Spielbretter, sechs Kameras und ein Buzzer, der keine
                Ausreden kennt. Die private Quizshow für eingeladene Gäste.
              </p>
            </div>

            <div className="grid border-t border-white/8 sm:grid-cols-3 sm:divide-x sm:divide-white/8">
              {[
                ["01", "Anmelden", "Mit Twitch und Spielcode"],
                ["02", "Bereitmachen", "Kamera und Ton prüfen"],
                ["03", "Spielen", "Buzzern, antworten, punkten"],
              ].map(([index, title, detail]) => (
                <div key={index} className="flex gap-3 py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                  <span className="font-mono text-[10px] font-black text-lime-200/38">
                    {index}
                  </span>
                  <div>
                    <div className="text-sm font-black text-emerald-50">{title}</div>
                    <div className="mt-1 text-xs text-emerald-100/42">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-panel p-5 sm:p-7 lg:col-span-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
            <div>
              <div className="section-kicker">Spielzugang</div>
              <h2 className="mt-2 text-2xl font-black text-emerald-50">
                Bereit für die Quizshow
              </h2>
            </div>
            <span className="quiz-status">Bis zu 6 Gäste</span>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-lg border border-red-300/20 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          {session?.user ? (
            <div className="mt-5 flex flex-col gap-6">
              <div className="flex items-center gap-4 border-b border-white/8 pb-5">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "Twitch-Avatar"}
                    width={48}
                    height={48}
                    className="size-12 rounded-lg border border-lime-200/24 object-cover"
                  />
                ) : (
                  <div className="size-12 rounded-lg border border-white/10 bg-white/[0.04]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="section-kicker">Angemeldet</div>
                  <div className="mt-1 truncate text-lg font-black text-emerald-50">
                    {session.user.name}
                  </div>
                  <div className="truncate text-xs text-emerald-100/45">
                    @{session.user.twitchLogin}
                  </div>
                </div>
                <span className="quiz-status border-lime-200/18 text-lime-100/70">
                  <span className="quiz-live-dot" /> Online
                </span>
              </div>

              {canHost ? (
                <div>
                  <div className="section-kicker">Host</div>
                  <h3 className="mt-2 text-lg font-black text-emerald-50">
                    Neues Spiel eröffnen
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/52">
                    Erstellt einen neuen Code und öffnet die Lobby.
                  </p>
                  <div className="mt-4">
                    <CreateGameButton />
                  </div>
                </div>
              ) : null}

              <div className={canHost ? "border-t border-white/8 pt-6" : ""}>
                <div className="section-kicker">Teilnehmen</div>
                <h3 className="mt-2 text-lg font-black text-emerald-50">
                  Spielcode eingeben
                </h3>
                <p className="mt-2 text-sm leading-6 text-emerald-100/52">
                  Den Code aus der Einladung verwenden, um dem richtigen Team
                  beizutreten.
                </p>
                <div className="mt-4">
                  <JoinGameForm />
                </div>
              </div>

              <form
                className="border-t border-white/8 pt-4"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-xs font-bold text-emerald-100/42 transition hover:text-lime-100">
                  Twitch-Konto abmelden
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-5 flex min-h-[26rem] flex-col justify-between">
              <div>
                <div className="section-kicker">Twitch Login</div>
                <h3 className="mt-3 text-2xl font-black text-emerald-50">
                  Deine Identität für Spiel, Kamera und Chat.
                </h3>
                <p className="mt-3 text-sm leading-7 text-emerald-100/52">
                  Deine Twitch-Identität verbindet Avatar, Anzeigename und den
                  richtigen Chat mit dem Spiel. Ohne Einladungscode bleibt
                  der Zugang geschlossen.
                </p>
              </div>

              <div className="border-t border-white/8 pt-5">
                <form
                  action={async () => {
                    "use server";
                    await signIn("twitch", { redirectTo: "/" });
                  }}
                >
                  <button type="submit" className="quiz-button-primary w-full py-3 text-sm">
                    Mit Twitch anmelden
                  </button>
                </form>
                <p className="mt-3 text-center text-xs leading-5 text-emerald-100/34">
                  Zugang nur für eingeladene Teilnehmer dieser Quizrunde.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/7 px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 text-xs text-emerald-100/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Lauchgruen · Allgemeinwissen Quiz</span>
          <a href={VEXIFY_URL} target="_blank" rel="noreferrer" className="font-bold transition hover:text-lime-100">
            Crafted by Vexify
          </a>
        </div>
      </footer>
    </div>
  );
}
