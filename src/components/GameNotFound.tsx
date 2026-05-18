"use client";

import Image from "next/image";

interface Props {
  code?: string;
  reason?: "not_found" | "kicked";
}

function apexHomeUrl(): string {
  if (typeof window === "undefined") return "https://lauchgruen.de";

  const { hostname, port, protocol } = window.location;
  if (hostname.startsWith("quiz.")) {
    const apex = hostname.replace(/^quiz\./, "");
    const portSuffix = port ? `:${port}` : "";
    return `${protocol}//${apex}${portSuffix}`;
  }

  return "/";
}

export function GameNotFound({ code, reason = "not_found" }: Props) {
  const homeUrl = apexHomeUrl();
  const isKick = reason === "kicked";
  const heading = isKick ? "Aus dem Spiel entfernt" : "Spiel nicht gefunden";
  const body = isKick
    ? "Der Host hat dich aus dieser Lobby entfernt."
    : "Dieses Spiel existiert nicht mehr - vermutlich ist die Runde vorbei oder der Code stimmt nicht.";

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 px-6 py-16 text-emerald-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-amber-400/10 to-transparent blur-3xl" />

      <div className="relative flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <Image
          src="/bear-logo.png"
          alt="QuizDuell Baer"
          width={140}
          height={140}
          className="opacity-90 drop-shadow-2xl"
          priority
        />

        <div className="space-y-3">
          <div className="text-7xl font-extrabold tracking-tight text-amber-300 drop-shadow-lg">
            {isKick ? "X" : "404"}
          </div>
          <h1 className="text-3xl font-extrabold text-amber-100">{heading}</h1>
          <p className="leading-relaxed text-emerald-200/80">{body}</p>
          {code ? (
            <p className="text-sm text-emerald-300/70">
              {isKick ? "Code:" : "Gesuchter Code:"}{" "}
              <span className="font-mono font-extrabold tracking-widest text-amber-300">
                {code}
              </span>
            </p>
          ) : null}
        </div>

        <a
          href={homeUrl}
          className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 px-8 py-4 text-lg font-extrabold text-emerald-950 shadow-2xl shadow-amber-400/30 transition-all hover:scale-105 hover:from-amber-300 hover:to-amber-500 active:scale-95"
        >
          <span>Zurück zur Startseite</span>
        </a>
      </div>
    </div>
  );
}
