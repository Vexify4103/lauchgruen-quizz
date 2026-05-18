"use client";

import Image from "next/image";
import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
}

const POINT_VALUES = [100, 200, 300, 400, 500];

export function StartingSoon({ game }: Props) {
  const previewCategories =
    game.boards[0]?.categories.slice(0, 6) ??
    Array.from({ length: 6 }, (_, i) => ({ id: `_${i}`, displayName: "-" }));

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.7rem] border border-amber-300/20 bg-emerald-950/50 p-5 shadow-2xl shadow-black/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.16),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-300/10 to-transparent" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <Image
          src="/bear-logo.png"
          alt="QuizDuell Bear"
          width={138}
          height={138}
          className="drop-shadow-2xl"
          priority
          fetchPriority="high"
        />
        <div className="mt-5 text-6xl font-black tracking-tight text-amber-300 drop-shadow-lg">
          QUIZ<span className="text-emerald-100">DUELL</span>
        </div>
        <div className="mt-4 rounded-full border border-amber-300/28 bg-amber-300/12 px-6 py-2 text-xl font-black uppercase tracking-[0.28em] text-emerald-50">
          Gleich geht's los
        </div>
        <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-emerald-100/72">
          Die Kameras sind live. Der Host startet die Runde, sobald alle bereit
          sind.
        </p>
      </div>

      <div className="relative z-10 mt-5 grid h-[34%] min-h-[190px] gap-1.5 opacity-38">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${previewCategories.length}, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${POINT_VALUES.length}, minmax(0, 1fr))`,
          }}
        >
          {previewCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-center rounded-lg border border-red-500/40 bg-red-700/60 px-1 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-white"
            >
              {cat.displayName}
            </div>
          ))}

          {POINT_VALUES.map((points) =>
            previewCategories.map((cat) => (
              <div
                key={`${cat.id}-${points}`}
                className="flex items-center justify-center rounded-lg border border-emerald-700/60 bg-gradient-to-br from-emerald-800/70 to-emerald-900/70 font-extrabold italic text-amber-300/70"
                style={{ fontSize: "clamp(0.6rem, 1.4vw, 1.1rem)" }}
              >
                {points}
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
