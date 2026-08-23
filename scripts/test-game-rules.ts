import assert from "node:assert/strict";
import { canAcceptBuzz, judgmentScoreDelta, recordResolvedTurn } from "../src/server/game-rules";
import { normalizeRestoredGame, registerBonusBuzzerRounds } from "../src/server/game-state";
import { correctMultiplierLabel, scoringRuleLabels } from "../src/lib/scoring-rules";
import type { BoardData, GameState, Player } from "../src/server/types";

assert.equal(correctMultiplierLabel(0), null, "board one has no point multiplier badge");
assert.equal(correctMultiplierLabel(2), "×2", "board three exposes its double-points badge");
assert.equal(correctMultiplierLabel(2, true), null, "bonus scoring overrides board three");
assert.deepEqual(
  scoringRuleLabels(2),
  ["Richtig +2×", "Falsch −1×"],
  "the displayed final-board rules match score calculation",
);

assert.equal(
  judgmentScoreDelta({ correct: false, points: 300, boardIndex: 0, isBonus: false, isPickerFirstAttempt: true }),
  0,
  "the regular picker's first wrong answer is penalty-free",
);
assert.equal(
  judgmentScoreDelta({ correct: false, points: 300, boardIndex: 1, isBonus: false, isPickerFirstAttempt: false }),
  -150,
  "a wrong fallback buzz loses half points",
);
assert.equal(
  judgmentScoreDelta({ correct: true, points: 300, boardIndex: 1, isBonus: false, isPickerFirstAttempt: false }),
  300,
  "a correct fallback buzz wins full points",
);
assert.equal(
  judgmentScoreDelta({ correct: true, points: 300, boardIndex: 2, isBonus: false, isPickerFirstAttempt: true }),
  600,
  "board three doubles correct answers",
);
assert.equal(
  judgmentScoreDelta({ correct: false, points: 300, boardIndex: 2, isBonus: false, isPickerFirstAttempt: true }),
  -300,
  "board three deducts full points for wrong answers",
);
assert.equal(
  judgmentScoreDelta({ correct: false, points: 250, boardIndex: 2, isBonus: true, isPickerFirstAttempt: false }),
  -125,
  "a wrong bonus answer loses half its configured value regardless of the active board",
);

assert.equal(
  canAcceptBuzz({ phase: "buzzing", buzzersOpen: false, opensAt: 1_000, now: 1_000 }),
  true,
  "a buzz is accepted exactly at the advertised timestamp",
);
assert.equal(
  canAcceptBuzz({ phase: "buzzing", buzzersOpen: false, opensAt: 1_000, now: 999 }),
  false,
  "an early buzz is rejected",
);
assert.equal(
  canAcceptBuzz({ phase: "answering", buzzersOpen: true, opensAt: 1_000, now: 2_000 }),
  false,
  "buzzes outside a buzz phase are rejected",
);

const player = (id: string): Player => ({
  id,
  twitchLogin: id,
  displayName: id,
  avatarUrl: "",
  score: 0,
  ready: true,
  connected: true,
});
const game = {
  hostId: "host",
  players: {
    host: player("host"),
    p1: player("p1"),
    p2: player("p2"),
    p3: player("p3"),
  },
  playerOrder: ["host", "p1", "p2", "p3"],
  roundAnswered: [],
} as unknown as GameState;

assert.equal(recordResolvedTurn(game, "p1"), false);
assert.equal(recordResolvedTurn(game, "p1"), false, "duplicate resolution does not advance twice");
assert.equal(recordResolvedTurn(game, "p2"), false);
assert.equal(recordResolvedTurn(game, "p3"), true, "the last contestant completes the round");
assert.deepEqual(game.roundAnswered, [], "a completed round starts fresh");

const board = (): BoardData => ({
  categories: [{ id: "test", displayName: "Test" }],
  board: [{ category: "test", points: 100, questionId: "test_100", used: false }],
});
const restoredGame = (phase: GameState["phase"]): GameState => {
  const savedBoard = board();
  return {
    id: "REST01",
    hostId: "host",
    phase,
    players: {
      host: player("host"),
      p1: player("p1"),
      p2: player("p2"),
      p3: player("p3"),
    },
    playerOrder: ["host", "p1", "p2", "p3"],
    currentTurn: "p3",
    categories: structuredClone(savedBoard.categories),
    board: structuredClone(savedBoard.board),
    boards: [savedBoard],
    currentBoardIndex: 0,
    activeQuestion: {
      questionId: "test_100",
      category: "test",
      points: 100,
      pickedBy: "p3",
      buzzersOpen: false,
      buzzersOpenedAt: Date.now() - 1_000,
      currentAnswerer: null,
      alreadyTried: ["p3"],
      answerRevealed: false,
    },
    reviewQuestion: null,
    isBonusRound: false,
    usedBonusBuzzerIds: [],
    winnerId: null,
    createdAt: Date.now(),
    roundAnswered: ["p1", "p2"],
  };
};

const restoredBuzz = restoredGame("buzzing");
normalizeRestoredGame(restoredBuzz);
assert.equal(restoredBuzz.activeQuestion?.buzzersOpen, true, "an interrupted buzzer reopens");
assert.equal(restoredBuzz.players.p1.connected, false, "connections restart as offline");
assert.strictEqual(restoredBuzz.board, restoredBuzz.boards[0].board, "the board reference is relinked");

registerBonusBuzzerRounds([
  {
    id: "_bonus_buzzer_test",
    prompt: "Test prompt",
    instruction: "Test instruction",
    answer: "Test answer",
    points: 250,
  },
]);
const restoredReveal = restoredGame("answering");
restoredReveal.activeQuestion!.answerRevealed = true;
normalizeRestoredGame(restoredReveal);
assert.equal(restoredReveal.board[0].used, true, "a revealed question is completed on restore");
assert.equal(restoredReveal.activeQuestion, null);
assert.equal(restoredReveal.phase, "bonus_pending", "the last resolved turn still triggers its bonus");
assert.equal(restoredReveal.isBonusRound, true);
assert.deepEqual(restoredReveal.roundAnswered, []);

console.log("[game-rules] scoring, buzzer timing, round completion, and restart recovery OK");
