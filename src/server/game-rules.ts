import type { GamePhase, GameState, PlayerId } from "./types";

export function canAcceptBuzz({
  phase,
  buzzersOpen,
  opensAt,
  now,
}: {
  phase: GamePhase;
  buzzersOpen: boolean;
  opensAt: number | null;
  now: number;
}): boolean {
  const inBuzzPhase = phase === "buzzing" || phase === "bonus_buzzing";
  return inBuzzPhase && (buzzersOpen || (opensAt !== null && now >= opensAt));
}

export function judgmentScoreDelta({
  correct,
  points,
  isBoard3,
  isPickerFirstAttempt,
}: {
  correct: boolean;
  points: number;
  isBoard3: boolean;
  isPickerFirstAttempt: boolean;
}): number {
  if (correct) return isBoard3 ? points * 2 : points;
  if (isBoard3) return -points;
  if (isPickerFirstAttempt) return 0;
  return -Math.floor(points / 2);
}

/** Records a resolved regular turn and reports when every contestant had one. */
export function recordResolvedTurn(game: GameState, pickedBy: PlayerId): boolean {
  if (pickedBy === game.hostId || !game.players[pickedBy]) return false;

  if (!game.roundAnswered.includes(pickedBy)) {
    game.roundAnswered.push(pickedBy);
  }

  const contestantIds = game.playerOrder.filter(
    (playerId) => playerId !== game.hostId && Boolean(game.players[playerId]),
  );
  const roundComplete =
    contestantIds.length > 0 &&
    contestantIds.every((playerId) => game.roundAnswered.includes(playerId));

  if (roundComplete) game.roundAnswered = [];
  return roundComplete;
}
