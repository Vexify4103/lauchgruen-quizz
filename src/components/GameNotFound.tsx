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
    ? "Der Host hat dich aus der Lobby entfernt."
    : "Dieses Spiel existiert nicht mehr - vermutlich ist es vorbei oder der Code stimmt nicht.";

  return (
    <div className="quiz-shell relative flex min-h-screen w-full flex-col items-center justify-center bg-[#04110b] px-6 py-16 text-emerald-50">
      <div className="surface-panel-strong relative flex w-full max-w-lg flex-col items-center gap-7 p-8 text-center sm:p-10">
        <Image
          src="/bear-logo.png"
          alt="Lauchgruen"
          width={140}
          height={140}
          className="size-28 rounded-lg border border-lime-300/25 object-cover shadow-[0_0_34px_rgba(163,230,53,0.2)]"
          priority
        />

        <div className="space-y-3">
          <div className="text-6xl font-black text-lime-200">
            {isKick ? "X" : "404"}
          </div>
          <h1 className="text-3xl font-black text-emerald-50">{heading}</h1>
          <p className="leading-relaxed text-emerald-100/58">{body}</p>
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
          className="quiz-button-primary px-7 py-3 text-sm"
        >
          <span>Zurück zur Startseite</span>
        </a>
      </div>
    </div>
  );
}
