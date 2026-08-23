"use client";

import Image from "next/image";
import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
}

export function StartingSoon({ game }: Props) {
  const previewCategories =
    game.boards[0]?.categories.slice(0, 6) ??
    Array.from({ length: 6 }, (_, i) => ({ id: `_${i}`, displayName: "-" }));

  return (
    <div className="starting-soon-stage relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-lime-300/20 p-5 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <Image
          src="/bear-logo.png"
          alt="Lauchgruen"
          width={138}
          height={138}
          className="size-28 rounded-lg border border-lime-300/25 object-cover shadow-[0_0_42px_rgba(163,230,53,0.22)]"
          priority
          fetchPriority="high"
        />
        <div className="quiz-display quiz-wordmark mt-5 text-2xl font-black drop-shadow-lg sm:text-5xl">
          Allgemeinwissen <strong>Quiz</strong>
        </div>
        <div className="quiz-status mt-4 border-lime-300/25 bg-black/35 px-5 py-2 text-sm text-lime-50">
          <span className="quiz-live-dot" /> Die Quizshow beginnt in Kürze
        </div>
        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-emerald-100/54">
          Die Kameras sind live. Alle Gäste sind bereit und warten auf das
          Startsignal des Hosts.
        </p>
      </div>

      <div className="category-strip relative z-10 mt-5 grid grid-cols-3 gap-1.5 rounded-lg p-2 sm:grid-cols-6">
          {previewCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex min-h-12 items-center justify-center border-r border-lime-200/10 px-2 py-2 text-center text-[10px] font-black uppercase text-lime-50/76 last:border-r-0"
            >
              {cat.displayName}
            </div>
          ))}
      </div>
    </div>
  );
}
