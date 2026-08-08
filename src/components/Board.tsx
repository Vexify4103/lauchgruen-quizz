"use client";

import type { ClientGameState } from "@/server/types";

interface Props {
  game: ClientGameState;
  onPickCell?: (category: string, points: number) => void;
  onViewCell?: (category: string, points: number) => void;
  onSwitchBoard?: (index: number) => void;
}

const POINT_VALUES = [100, 200, 300, 400, 500] as const;

export function Board({ game, onPickCell, onViewCell, onSwitchBoard }: Props) {
  const hasMultipleBoards = game.boards.length > 1;
  const isBoardLocked = game.boards
    .slice(0, game.currentBoardIndex)
    .some((board) => !board.board.every((cell) => cell.used));

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {hasMultipleBoards ? (
        <div className="flex shrink-0 gap-2">
          {game.boards.map((board, idx) => {
            const isCurrent = idx === game.currentBoardIndex;
            const allUsed = board.board.length > 0 && board.board.every((cell) => cell.used);
            const canSwitch = !!onSwitchBoard && !isCurrent;

            return (
              <button
                key={idx}
                type="button"
                disabled={!canSwitch}
                onClick={() => canSwitch && onSwitchBoard?.(idx)}
                className={[
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-black uppercase transition-all",
                  isCurrent
                    ? "border-orange-200/45 bg-orange-500 text-orange-50 shadow-lg shadow-orange-950/30"
                    : allUsed
                      ? "border-emerald-900/30 bg-emerald-950/30 text-emerald-700 line-through"
                      : canSwitch
                        ? "border-white/10 bg-white/[0.04] text-orange-100 hover:border-orange-300/30 hover:bg-orange-400/[0.08]"
                        : "border-white/8 bg-white/[0.025] text-emerald-100/30",
                ].join(" ")}
              >
                Prüfung {idx + 1}
              </button>
            );
          })}
        </div>
      ) : null}

      {isBoardLocked ? (
        <div className="shrink-0 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-4 py-2 text-center text-xs font-bold uppercase text-amber-100/75">
          Prüfung {game.currentBoardIndex + 1} wird freigeschaltet, sobald die vorige Prüfung abgeschlossen ist
        </div>
      ) : null}

      <div
        className="grid min-h-0 flex-1 select-none gap-1.5 rounded-lg border border-white/7 bg-black/25 p-1.5"
        style={{
          gridTemplateColumns: `repeat(${game.categories.length}, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(${POINT_VALUES.length}, minmax(0, 1fr))`,
        }}
      >
        {game.categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-center rounded-lg border border-orange-300/18 bg-gradient-to-b from-[#4a1f12] to-[#25120d] px-2 py-3 text-center text-[11px] font-black uppercase text-orange-50 shadow-lg shadow-black/20"
          >
            {category.displayName}
          </div>
        ))}

        {POINT_VALUES.map((points) =>
          game.categories.map((category) => {
            const cell = game.board.find(
              (boardCell) =>
                boardCell.category === category.id && boardCell.points === points,
            );

            if (!cell) {
              return (
                <div
                  key={`${category.id}-${points}`}
                  className="rounded-lg bg-black/20"
                />
              );
            }

            if (cell.used) {
              return (
                <button
                  key={`${category.id}-${points}`}
                  type="button"
                  disabled={!onViewCell}
                  onClick={() => onViewCell?.(category.id, points)}
                  className={[
                    "relative flex items-center justify-center overflow-hidden rounded-lg border text-center font-black transition-all",
                    "border-stone-800/45 bg-gradient-to-b from-stone-950/50 to-stone-950/75 text-stone-600/82",
                    onViewCell
                      ? "hover:border-orange-400/25 hover:bg-orange-950/70 hover:text-orange-500"
                      : "cursor-not-allowed",
                  ].join(" ")}
                  style={{ fontSize: "clamp(0.8rem, 1.8vw, 1.4rem)" }}
                  title={onViewCell ? "Frage zur Nachschau öffnen" : undefined}
                >
                  <span className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-orange-900/45" />
                  <span className="relative">{points}</span>
                </button>
              );
            }

            if (isBoardLocked) {
              return (
                <div
                  key={`${category.id}-${points}`}
                  className="flex items-center justify-center rounded-lg border border-white/5 bg-black/18 text-xl text-emerald-100/20"
                  title="Vorherige Prüfung muss erst abgeschlossen werden"
                >
                  •
                </div>
              );
            }

            return (
              <button
                key={`${category.id}-${points}`}
                type="button"
                disabled={!onPickCell}
                onClick={() => onPickCell?.(category.id, points)}
                className={[
                  "relative flex items-center justify-center overflow-hidden rounded-lg border text-center font-black transition-all",
                  "border-orange-300/18 bg-gradient-to-b from-[#4a2114] via-[#2e1710] to-[#170c09] text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                  onPickCell
                    ? "hover:-translate-y-0.5 hover:border-orange-300/40 hover:from-[#713117] hover:via-[#4b2113] hover:to-[#21100c] hover:text-orange-100 hover:shadow-xl hover:shadow-orange-950/30 active:translate-y-0"
                    : "",
                ].join(" ")}
                style={{ fontSize: "clamp(0.85rem, 2vw, 1.55rem)" }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/6 to-transparent" />
                <span className="relative">{points}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
