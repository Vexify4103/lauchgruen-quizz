import type { GamePhase, GameState, PlayerId } from "./types";
import { getScoringRule } from "../lib/scoring-rules";

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
  boardIndex,
  isBonus,
  isPickerFirstAttempt,
}: {
  correct: boolean;
  points: number;
  boardIndex: number;
  isBonus: boolean;
  isPickerFirstAttempt: boolean;
}): number {
  const rule = getScoringRule(boardIndex, isBonus);
  if (correct) return points * rule.correctMultiplier;
  if (isPickerFirstAttempt && rule.pickerFirstWrongFree) return 0;
  return -Math.floor(points * rule.wrongMultiplier);
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
