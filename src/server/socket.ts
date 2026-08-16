import type { Server as SocketIOServer, Socket } from "socket.io";
import { z } from "zod";
import {
  addPlayer,
  awardPoints,
  checkGameOver,
  getGame,
  getNonHostPlayers,
  getQuestion,
  makePlayer,
  markCellUsed,
  nextTurn,
  pickNextBonusBuzzerRound,
  registerBonusBuzzerRounds,
  registerQuestionPool,
  removePlayer,
  reorderContestants,
  restoreGames,
  serializeFor,
  setActiveQuestion,
  setPlayerConnected,
  setReady,
  setReviewQuestion,
  switchBoard,
} from "./game-state";
import { loadBonusBuzzerRounds, loadQuestionPool } from "../lib/questions";
import { decodeSessionFromCookie } from "./socket-auth";
import { canAcceptBuzz, judgmentScoreDelta, recordResolvedTurn } from "./game-rules";
import { restorePersistedGames, saveGame } from "./game-persistence";
import {
  BUZZ_ARM_DELAY_MS,
  BUZZ_COLLECTION_WINDOW_MS,
  type GamePhase,
  type GameState,
  type PlayerId,
} from "./types";

interface SocketData {
  userId: string;
  twitchLogin: string;
  displayName: string;
  avatarUrl: string;
  gameId?: string;
}

type AuthedSocket = Socket & { data: SocketData };

let questionPoolReady = false;
function ensureQuestionPool() {
  if (questionPoolReady) return;
  registerQuestionPool(loadQuestionPool());
  registerBonusBuzzerRounds(loadBonusBuzzerRounds());
  questionPoolReady = true;
}

interface PendingBuzz {
  playerId: PlayerId;
  clientReactionMs: number;
  receivedAt: number;
}

const buzzCollectors = new Map<
  string,
  { buzzes: PendingBuzz[]; timer: NodeJS.Timeout }
>();

/** Pending auto-close timers after host:reveal_and_close. */
const revealCloseTimers = new Map<string, NodeJS.Timeout>();
const buzzerOpenTimers = new Map<string, NodeJS.Timeout>();

/**
 * Tracks active socket IDs per (gameId, userId). Lets us tell when a user has
 * truly disconnected (no remaining sockets) vs. just closed one tab while
 * another is still open. Key format: `${gameId}:${userId}`.
 */
const userSocketsByGame = new Map<string, Set<string>>();
function trackUserSocket(gameId: string, userId: string, socketId: string): void {
  const key = `${gameId}:${userId}`;
  const set = userSocketsByGame.get(key) ?? new Set<string>();
  set.add(socketId);
  userSocketsByGame.set(key, set);
}
function untrackUserSocket(gameId: string, userId: string, socketId: string): number {
  const key = `${gameId}:${userId}`;
  const set = userSocketsByGame.get(key);
  if (!set) return 0;
  set.delete(socketId);
  if (set.size === 0) {
    userSocketsByGame.delete(key);
    return 0;
  }
  return set.size;
}

function broadcastState(io: SocketIOServer, game: GameState) {
  for (const [, sock] of io.sockets.sockets) {
    const s = sock as AuthedSocket;
    if (s.data.gameId !== game.id) continue;
    s.emit("state", serializeFor(game, s.data.userId));
  }
}

function broadcastSpectatorState(io: SocketIOServer, game: GameState) {
  io.to(`spectator:${game.id}`).emit("state", serializeFor(game, null));
}

function broadcastAll(io: SocketIOServer, game: GameState) {
  broadcastState(io, game);
  broadcastSpectatorState(io, game);
  void saveGame(game).catch((error) => {
    console.error(`[persistence] failed to save game ${game.id}`, error);
  });
}

function clearBuzzerOpenTimer(gameId: string): void {
  const timer = buzzerOpenTimers.get(gameId);
  if (timer) clearTimeout(timer);
  buzzerOpenTimers.delete(gameId);
}

function armBuzzers(
  io: SocketIOServer,
  game: GameState,
  phase: Extract<GamePhase, "buzzing" | "bonus_buzzing">,
): void {
  const active = game.activeQuestion;
  if (!active) return;

  clearBuzzerOpenTimer(game.id);
  const serverNow = Date.now();
  const opensAt = serverNow + BUZZ_ARM_DELAY_MS;

  active.buzzersOpen = false;
  active.buzzersOpenedAt = opensAt;
  active.currentAnswerer = null;
  game.phase = phase;

  io.to(`game:${game.id}`).emit("buzzers_armed", { serverNow, opensAt });
  io.to(`spectator:${game.id}`).emit("buzzers_armed", { serverNow, opensAt });
  broadcastAll(io, game);

  const questionId = active.questionId;
  const timer = setTimeout(() => {
    buzzerOpenTimers.delete(game.id);
    const latest = getGame(game.id);
    const latestActive = latest?.activeQuestion;
    if (!latest || !latestActive) return;
    if (latestActive.questionId !== questionId) return;
    if (latestActive.buzzersOpenedAt !== opensAt) return;
    if (latest.phase !== phase) return;

    latestActive.buzzersOpen = true;
    latestActive.buzzersOpenedAt = opensAt;
    io.to(`game:${latest.id}`).emit("buzzers_opened", {
      serverNow: Date.now(),
      openedAt: opensAt,
    });
    io.to(`spectator:${latest.id}`).emit("buzzers_opened", {
      serverNow: Date.now(),
      openedAt: opensAt,
    });
    broadcastAll(io, latest);
  }, BUZZ_ARM_DELAY_MS);

  buzzerOpenTimers.set(game.id, timer);
}

function isHost(socket: AuthedSocket, game: GameState): boolean {
  return socket.data.userId === game.hostId;
}

function emitError(socket: AuthedSocket, code: string, message: string) {
  socket.emit("error", { code, message });
}

function finishGameIfOver(game: GameState): boolean {
  const winner = checkGameOver(game);
  if (!winner) return false;

  game.phase = "finished";
  game.winnerId = winner;
  game.isBonusRound = false;
  setActiveQuestion(game, null);
  return true;
}

function closeBonusRound(game: GameState): void {
  const questionId = game.activeQuestion?.questionId;
  if (questionId && !game.usedBonusBuzzerIds.includes(questionId)) {
    game.usedBonusBuzzerIds.push(questionId);
  }

  game.isBonusRound = false;
  setActiveQuestion(game, null);
  if (!finishGameIfOver(game)) {
    game.phase = "playing";
  }
}

function finishResolvedRegularQuestion(game: GameState, pickedBy: PlayerId): void {
  const roundComplete = recordResolvedTurn(game, pickedBy);
  if (roundComplete && pickNextBonusBuzzerRound(game)) {
    game.isBonusRound = true;
    game.phase = "bonus_pending";
    return;
  }

  finishGameIfOver(game);
}

// ---------------------------------------------------------------------------
// Buzz resolution — shared between regular buzz and bonus-buzz phases
// ---------------------------------------------------------------------------
function resolveBuzzes(io: SocketIOServer, gameId: string) {
  const collector = buzzCollectors.get(gameId);
  if (!collector) {
    console.log(`[buzz] resolveBuzzes(${gameId}): no collector, abort`);
    return;
  }
  buzzCollectors.delete(gameId);

  const game = getGame(gameId);
  if (!game) {
    console.log(`[buzz] resolveBuzzes(${gameId}): no game, abort`);
    return;
  }

  const isBonusBuzz = game.phase === "bonus_buzzing";
  console.log(
    `[buzz] resolveBuzzes(${gameId}): phase=${game.phase} buzzes=${collector.buzzes.length} bonus=${isBonusBuzz}`,
  );

  // Guard: during regular buzz, activeQuestion.buzzersOpen must be true.
  if (!isBonusBuzz && !game.activeQuestion?.buzzersOpen) {
    console.log(`[buzz] resolveBuzzes(${gameId}): regular buzz but buzzers closed, abort`);
    return;
  }

  const winner = collector.buzzes.sort(
    (a, b) =>
      a.clientReactionMs - b.clientReactionMs ||
      a.receivedAt - b.receivedAt,
  )[0];

  if (isBonusBuzz) {
    if (!winner) {
      // Nobody buzzed — drop the image, resume play. Turn was already advanced
      // when the regular round question resolved, so don't advance again.
      console.log(`[buzz] bonus: no winner → discard image, phase=playing`);
      closeBonusRound(game);
      broadcastAll(io, game);
      return;
    }
    console.log(
      `[buzz] bonus winner: ${winner.playerId} (${winner.clientReactionMs}ms) → answering the image`,
    );
    // The winner now answers the bonus image (just like a regular buzz-winner
    // answers a regular question). The host judges via host:judge as usual;
    // wasBonus=true tells the judge handler to advance turn normally.
    if (game.activeQuestion) {
      game.activeQuestion.buzzersOpen     = false;
      game.activeQuestion.currentAnswerer = winner.playerId;
    }
    game.phase = "answering";
    io.to(`game:${gameId}`).emit("buzz_winner", {
      playerId: winner.playerId,
      reactionMs: winner.clientReactionMs,
    });
    io.to(`spectator:${gameId}`).emit("buzz_winner", {
      playerId: winner.playerId,
      reactionMs: winner.clientReactionMs,
    });
    broadcastAll(io, game);
    return;
  }

  // Regular buzz resolution
  if (!winner) return;

  game.activeQuestion!.buzzersOpen = false;
  game.activeQuestion!.currentAnswerer = winner.playerId;
  game.phase = "answering";
  // Do NOT change currentTurn here — it still reflects the original picker,
  // which is what nextTurn() must advance *from* when the buzz winner answers.

  io.to(`game:${gameId}`).emit("buzz_winner", {
    playerId: winner.playerId,
    reactionMs: winner.clientReactionMs,
  });
  io.to(`spectator:${gameId}`).emit("buzz_winner", {
    playerId: winner.playerId,
    reactionMs: winner.clientReactionMs,
  });
  broadcastAll(io, game);
}

// ---------------------------------------------------------------------------
// Zod payload schemas
// ---------------------------------------------------------------------------
const JoinGamePayload      = z.object({ gameId: z.string().min(1) });
const SpectateGamePayload  = z.object({ gameId: z.string().min(1) });
const PickCellPayload      = z.object({ category: z.string(), points: z.number().int().positive() });
const JudgePayload         = z.object({ correct: z.boolean() });
const JudgeUsedPayload     = z.object({
  category: z.string(),
  points: z.number().int().positive(),
  playerId: z.string(),
  correct: z.boolean(),
});
const SetTurnPayload       = z.object({ playerId: z.string() });
const AdjustScorePayload   = z.object({
  playerId: z.string().min(1),
  delta: z.number().int().min(-5000).max(5000).refine((delta) => delta !== 0),
});
const BuzzPayload          = z.object({ clientReactionMs: z.number().min(0).max(60_000) });
const SetReadyPayload      = z.object({ ready: z.boolean() });
const ReorderPlayersPayload = z.object({ playerOrder: z.array(z.string()).max(5) });
const SwitchBoardPayload   = z.object({ index: z.number().int().min(0) });
const OpenReviewPayload    = z.object({ category: z.string(), points: z.number().int().positive() });

// ---------------------------------------------------------------------------
export async function registerSocketHandlers(io: SocketIOServer): Promise<void> {
  ensureQuestionPool();
  restoreGames(await restorePersistedGames());

  io.use(async (socket, nextFn) => {
    const role = (socket.handshake.auth?.role as string) ?? "player";
    if (role === "spectator") {
      (socket as AuthedSocket).data.userId = "";
      (socket as AuthedSocket).data.twitchLogin = "";
      (socket as AuthedSocket).data.displayName = "spectator";
      (socket as AuthedSocket).data.avatarUrl = "";
      return nextFn();
    }
    const ident = await decodeSessionFromCookie(socket.handshake.headers.cookie);
    if (!ident) return nextFn(new Error("UNAUTHENTICATED"));
    const data = (socket as AuthedSocket).data;
    data.userId      = ident.userId;
    data.twitchLogin = ident.twitchLogin;
    data.displayName = ident.displayName;
    data.avatarUrl   = ident.avatarUrl;
    nextFn();
  });

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    console.log(`[socket] connected: ${socket.id} (${socket.data.twitchLogin || "spectator"})`);

    // ── join / spectate / leave ───────────────────────────────────────────

    socket.on("join_game", async (payload: unknown, ack?: (resp: unknown) => void) => {
      const parsed = JoinGamePayload.safeParse(payload);
      if (!parsed.success) { emitError(socket, "BAD_PAYLOAD", "Invalid join_game payload"); ack?.({ ok: false }); return; }
      const game = getGame(parsed.data.gameId);
      if (!game) { emitError(socket, "GAME_NOT_FOUND", "Game does not exist"); ack?.({ ok: false }); return; }

      const existing = game.players[socket.data.userId];

      // Enforce the 5-contestant cap (host is separate). New contestants who
      // arrive after the lobby is full get bounced. Re-joiners (existing
      // players) are always allowed — they're already accounted for.
      if (!existing && socket.data.userId !== game.hostId) {
        const contestantCount = game.playerOrder.filter((pid) => pid !== game.hostId).length;
        if (contestantCount >= 5) {
          emitError(socket, "LOBBY_FULL", "Lobby ist voll (5 Teilnehmer)");
          ack?.({ ok: false });
          return;
        }
      }

      socket.data.gameId = game.id;
      await socket.join(`game:${game.id}`);
      trackUserSocket(game.id, socket.data.userId, socket.id);

      const player = existing ?? makePlayer({
        id:           socket.data.userId,
        twitchLogin:  socket.data.twitchLogin,
        displayName:  socket.data.displayName,
        avatarUrl:    socket.data.avatarUrl,
      });
      addPlayer(game, player);
      // addPlayer flips connected→true for rejoiners; new players default true.

      ack?.({ ok: true });
      broadcastAll(io, game);
    });

    socket.on("spectate_game", async (payload: unknown, ack?: (resp: unknown) => void) => {
      const parsed = SpectateGamePayload.safeParse(payload);
      if (!parsed.success) { ack?.({ ok: false }); return; }
      const game = getGame(parsed.data.gameId);
      if (!game) { ack?.({ ok: false }); return; }

      socket.data.gameId = game.id;
      await socket.join(`spectator:${game.id}`);
      socket.emit("state", serializeFor(game, null));
      ack?.({ ok: true });
    });

    socket.on("leave_game", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      void socket.leave(`game:${gameId}`);
      void socket.leave(`spectator:${gameId}`);
      socket.data.gameId = undefined;
    });

    // ── lobby ─────────────────────────────────────────────────────────────

    socket.on("player:set_ready", (payload: unknown) => {
      const parsed = SetReadyPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || game.phase !== "lobby") return;
      setReady(game, socket.data.userId, parsed.data.ready);
      broadcastAll(io, game);
    });

    socket.on("host:kick_player", (payload: unknown) => {
      const parsed = z.object({ playerId: z.string() }).safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      // Only allow kicks during lobby — once gameplay starts, removing players
      // mid-round would break turn rotation, round-tracking, etc.
      if (game.phase !== "lobby") return;
      // Hosts can't kick themselves.
      if (parsed.data.playerId === game.hostId) return;
      if (!game.players[parsed.data.playerId]) return;

      removePlayer(game, parsed.data.playerId);

      // Detach the kicked user's sockets from the game and tell them.
      for (const [, sock] of io.sockets.sockets) {
        const s = sock as AuthedSocket;
        if (s.data.gameId === gameId && s.data.userId === parsed.data.playerId) {
          s.emit("kicked");
          s.data.gameId = undefined;
          void s.leave(`game:${gameId}`);
          untrackUserSocket(gameId, parsed.data.playerId, s.id);
        }
      }

      broadcastAll(io, game);
    });

    socket.on("host:reorder_players", (payload: unknown) => {
      const parsed = ReorderPlayersPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (game.phase !== "lobby") return;

      if (!reorderContestants(game, parsed.data.playerOrder)) {
        emitError(socket, "BAD_PLAYER_ORDER", "Invalid player order");
        return;
      }

      broadcastAll(io, game);
    });

    socket.on("host:start_game", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (game.phase !== "lobby") return;
      const contestants = game.playerOrder.filter((pid) => pid !== game.hostId);
      if (contestants.length < 1) { emitError(socket, "NO_PLAYERS", "Need at least 1 contestant"); return; }
      game.phase = "playing";
      game.currentTurn = contestants[0];
      broadcastAll(io, game);
    });

    // ── board switching ───────────────────────────────────────────────────

    socket.on("host:switch_board", (payload: unknown) => {
      const parsed = SwitchBoardPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      // Only allow switching when no question is active
      if (game.phase !== "playing") return;
      switchBoard(game, parsed.data.index);
      broadcastAll(io, game);
    });

    // ── question pick ─────────────────────────────────────────────────────

    socket.on("host:pick_cell", (payload: unknown) => {
      const parsed = PickCellPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;

      // Safety net: if we're still in bonus_buzzing (e.g., 300ms window hadn't
      // elapsed when the host clicked, or the timer somehow stalled), force-
      // resolve any pending buzzes right now. After resolveBuzzes the phase
      // becomes "playing" with currentTurn = buzz winner, then we proceed.
      if (game.phase === "bonus_buzzing") {
        const collector = buzzCollectors.get(gameId);
        if (collector) {
          console.log(`[buzz] host:pick_cell during bonus_buzzing — force-resolving`);
          clearTimeout(collector.timer);
          resolveBuzzes(io, gameId);
        } else {
          console.log(`[buzz] host:pick_cell during bonus_buzzing with no buzzes — ignoring`);
          return;
        }
      }

      if (game.phase !== "playing") {
        console.log(`[buzz] host:pick_cell rejected — phase=${game.phase}`);
        return;
      }

      // Enforce progression: questions on board N are only pickable once all
      // cells on boards 0..N-1 are used.
      for (let i = 0; i < game.currentBoardIndex; i++) {
        const prev = game.boards[i];
        if (!prev || !prev.board.every((c) => c.used)) {
          emitError(socket, "BOARD_LOCKED", "Vorherige Felder müssen erst abgeschlossen werden");
          return;
        }
      }

      const cell = game.board.find(
        (c) => c.category === parsed.data.category && c.points === parsed.data.points,
      );
      if (!cell || cell.used) return;

      setActiveQuestion(game, {
        questionId:      cell.questionId,
        category:        cell.category,
        points:          cell.points,
        pickedBy:        game.currentTurn ?? game.hostId,
        buzzersOpen:     false,
        buzzersOpenedAt: null,
        currentAnswerer: game.currentTurn,
        alreadyTried:    [],
        answerRevealed:  false,
      });
      game.phase = "answering";
      broadcastAll(io, game);
    });

    // ── review (view used question on all screens) ────────────────────────

    socket.on("host:open_review", (payload: unknown) => {
      const parsed = OpenReviewPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (game.activeQuestion) return; // can't review during active question

      const cell = game.board.find(
        (c) => c.category === parsed.data.category && c.points === parsed.data.points && c.used,
      );
      if (!cell) return;

      setReviewQuestion(game, {
        questionId: cell.questionId,
        category:   cell.category,
        points:     cell.points,
      });
      broadcastAll(io, game);
    });

    socket.on("host:close_review", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      setReviewQuestion(game, null);
      broadcastAll(io, game);
    });

    /**
     * Judge a used (already answered) question — adjusts a player's score.
     * Used when the host reviews an old question and wants to credit/deduct a player.
     */
    socket.on("host:judge_used", (payload: unknown) => {
      const parsed = JudgeUsedPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (!game.reviewQuestion) return;

      const q = getQuestion(game.reviewQuestion.questionId);
      const points = q?.points ?? game.reviewQuestion.points;

      // Review-judge fully reverses a past award. Wrong = -points (not the
      // half-penalty used during live answering), so e.g. a previously-awarded
      // 400 correctly nets back to 0 when retroactively marked wrong.
      if (parsed.data.correct) {
        awardPoints(game, parsed.data.playerId, points);
      } else {
        awardPoints(game, parsed.data.playerId, -points);
      }

      // Close the review after judging
      setReviewQuestion(game, null);

      io.to(`game:${gameId}`).emit("judge_result", { correct: parsed.data.correct });
      io.to(`spectator:${gameId}`).emit("judge_result", { correct: parsed.data.correct });
      broadcastAll(io, game);
    });

    // ── buzzing ───────────────────────────────────────────────────────────

    socket.on("host:open_buzzers", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (!game.activeQuestion) return;

      armBuzzers(io, game, "buzzing");
    });

    /**
     * Host skips remaining buzzers: reveals the answer to everyone for 4 s,
     * then auto-closes the question and advances the turn.
     */
    socket.on("host:reveal_and_close", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (!game.activeQuestion) return;
      // Only valid while buzzers are open and nobody is currently answering.
      if (!game.activeQuestion.buzzersOpen || game.activeQuestion.currentAnswerer) return;

      // Cancel any pending buzz collection so no late buzz sneaks in.
      const collector = buzzCollectors.get(gameId);
      if (collector) {
        clearTimeout(collector.timer);
        buzzCollectors.delete(gameId);
      }
      clearBuzzerOpenTimer(gameId);

      // Cancel any existing reveal timer for this game.
      const existing = revealCloseTimers.get(gameId);
      if (existing) clearTimeout(existing);

      const aq = game.activeQuestion;
      const pickedBy  = aq.pickedBy;
      const wasBonus  = game.isBonusRound;

      // Reveal the answer to everyone.
      aq.buzzersOpen    = false;
      aq.answerRevealed = true;
      game.phase        = "answering"; // keeps modal open
      broadcastAll(io, game);

      // Auto-close after 4 seconds.
      const savedQuestionId = aq.questionId;
      const timer = setTimeout(() => {
        revealCloseTimers.delete(gameId);
        const g = getGame(gameId);
        if (!g?.activeQuestion?.answerRevealed) return;
        if (g.activeQuestion.questionId !== savedQuestionId) return;

        if (wasBonus) {
          closeBonusRound(g);
        } else {
          const category = g.activeQuestion.category;
          const points = g.activeQuestion.points;

          markCellUsed(g, category, points);
          g.isBonusRound = false;
          setActiveQuestion(g, null);
          nextTurn(g, pickedBy);
          g.phase = "playing";
          finishResolvedRegularQuestion(g, pickedBy);
        }

        broadcastAll(io, g);
      }, 4000);

      revealCloseTimers.set(gameId, timer);
    });

    socket.on("host:open_bonus_buzzers", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (game.phase !== "bonus_pending") return;

      // Pick the round now (not earlier) so no popup appeared before this click.
      const next = pickNextBonusBuzzerRound(game);
      if (!next) {
        // Pool exhausted between trigger and host click — just resume play.
        game.isBonusRound = false;
        if (!finishGameIfOver(game)) {
          game.phase = "playing";
        }
        broadcastAll(io, game);
        return;
      }

      console.log(`[buzz] host:open_bonus_buzzers — staging ${next.id}, phase: bonus_pending → bonus_buzzing`);
      setActiveQuestion(game, {
        questionId:      next.id,
        category:        "_bonus_buzzer",
        points:          next.points,
        pickedBy:        game.hostId,
        buzzersOpen:     false,
        buzzersOpenedAt: null,
        currentAnswerer: null,
        alreadyTried:    [],
        answerRevealed:  false,
      });
      armBuzzers(io, game, "bonus_buzzing");
    });

    socket.on("host:cancel_bonus_buzz", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      // Allow cancel during the pre-open pending phase, the buzz window itself,
      // AND the post-buzz pick window (phase = "playing" + isBonusRound = true).
      const inPendingPhase = game.phase === "bonus_pending";
      const inBuzzPhase    = game.phase === "bonus_buzzing";
      const inPickWindow   = game.phase === "playing" && game.isBonusRound && !game.activeQuestion;
      if (!inPendingPhase && !inBuzzPhase && !inPickWindow) return;

      // Cancel pending buzz collection
      const collector = buzzCollectors.get(gameId);
      if (collector) {
        clearTimeout(collector.timer);
        buzzCollectors.delete(gameId);
      }
      clearBuzzerOpenTimer(gameId);

      // If a question is already staged, closeBonusRound marks it as used so
      // it cannot return in a later bonus round.
      closeBonusRound(game);
      broadcastAll(io, game);
    });

    socket.on("host:force_resolve_bonus", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (game.phase !== "bonus_buzzing") return;
      const collector = buzzCollectors.get(gameId);
      console.log(`[buzz] host:force_resolve_bonus — buzzes=${collector?.buzzes.length ?? 0}`);
      if (collector) {
        clearTimeout(collector.timer);
        resolveBuzzes(io, gameId);
      } else {
        // No buzzes at all. Consume the bonus and resume without changing the
        // turn, which already advanced after the regular question.
        closeBonusRound(game);
        broadcastAll(io, game);
      }
    });

    socket.on("host:reopen_bonus_buzzers", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      const active = game.activeQuestion;
      if (!game.isBonusRound || !active || active.category !== "_bonus_buzzer") return;
      const answerer = active.currentAnswerer;
      if (!answerer) return;

      if (!active.alreadyTried.includes(answerer)) {
        active.alreadyTried.push(answerer);
      }

      const remainingEligible = getNonHostPlayers(game).filter(
        (player) => !active.alreadyTried.includes(player.id),
      );
      if (remainingEligible.length === 0) {
        closeBonusRound(game);
        broadcastAll(io, game);
        return;
      }

      const collector = buzzCollectors.get(gameId);
      if (collector) {
        clearTimeout(collector.timer);
        buzzCollectors.delete(gameId);
      }

      armBuzzers(io, game, "bonus_buzzing");
    });

    socket.on("host:skip_bonus_answer", () => {
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      const active = game.activeQuestion;
      if (!game.isBonusRound || !active || active.category !== "_bonus_buzzer") return;
      if (!active.currentAnswerer) return;

      closeBonusRound(game);
      broadcastAll(io, game);
    });

    socket.on("player:buzz", (payload: unknown) => {
      const parsed = BuzzPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game) return;

      const isBonusBuzz = game.phase === "bonus_buzzing";
      console.log(
        `[buzz] player:buzz from ${socket.data.twitchLogin} (${socket.data.userId}) phase=${game.phase} bonus=${isBonusBuzz}`,
      );

      // The client and server use the same advertised opensAt timestamp. Accept
      // a buzz once that timestamp has elapsed even if the server timer that
      // flips buzzersOpen is a few milliseconds late.
      const active = game.activeQuestion;
      const now = Date.now();
      const openByTimestamp =
        active?.buzzersOpenedAt !== null &&
        active?.buzzersOpenedAt !== undefined &&
        now >= active.buzzersOpenedAt;
      if (
        !active ||
        !canAcceptBuzz({
          phase: game.phase,
          buzzersOpen: active.buzzersOpen,
          opensAt: active.buzzersOpenedAt,
          now,
        })
      ) {
        console.log(`[buzz] player:buzz rejected: buzzers closed`);
        return;
      }
      if (openByTimestamp) active.buzzersOpen = true;

      const player = game.players[socket.data.userId];
      if (!player) return;
      // Host can't buzz, hosts only judge.
      if (socket.data.userId === game.hostId) return;

      if (active.alreadyTried.includes(socket.data.userId)) return;

      const buzz: PendingBuzz = {
        playerId:        socket.data.userId,
        clientReactionMs: parsed.data.clientReactionMs,
        receivedAt:      Date.now(),
      };

      let collector = buzzCollectors.get(gameId);
      if (!collector) {
        collector = {
          buzzes: [],
          timer: setTimeout(() => resolveBuzzes(io, gameId), BUZZ_COLLECTION_WINDOW_MS),
        };
        buzzCollectors.set(gameId, collector);
      }
      if (!collector.buzzes.find((b) => b.playerId === buzz.playerId)) {
        collector.buzzes.push(buzz);
      }
    });

    // ── judging ───────────────────────────────────────────────────────────

    socket.on("host:judge", (payload: unknown) => {
      const parsed = JudgePayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (!game.activeQuestion) return;
      const answerer = game.activeQuestion.currentAnswerer;
      if (!answerer) return;

      // Snapshot state we'll need after mutations.
      const pickedBy  = game.activeQuestion.pickedBy;
      const aqCategory = game.activeQuestion.category;
      const aqPoints   = game.activeQuestion.points;
      const q          = getQuestion(game.activeQuestion.questionId);
      const points     = q?.points ?? aqPoints;
      const wasBonus   = game.isBonusRound; // capture BEFORE any mutations

      let questionResolved = false;

      // Rule #1: the original picker's *first* attempt at their own cell is
      // penalty-free on regular boards. Buzz attempts AND bonus-image answers
      // always incur a penalty. Board 3 overrides this — wrong is always -points.
      const isPickerFirstAttempt =
        !wasBonus &&
        answerer === game.activeQuestion.pickedBy &&
        game.activeQuestion.alreadyTried.length === 0;

      // Board 3 (index 2) has special scoring: correct = x2 points, wrong = -points.
      const isBoard3 = !wasBonus && game.currentBoardIndex === 2;

      const scoreDelta = judgmentScoreDelta({
        correct: parsed.data.correct,
        points,
        isBoard3,
        isPickerFirstAttempt,
      });
      if (scoreDelta !== 0) awardPoints(game, answerer, scoreDelta);

      if (parsed.data.correct) {
        // Bonus image is not on the board, so no cell to mark used.
        if (!wasBonus) {
          markCellUsed(game, aqCategory, aqPoints);
        } else {
          // Track this bonus-buzzer round as used so it never repeats.
          if (!game.usedBonusBuzzerIds.includes(game.activeQuestion.questionId)) {
            game.usedBonusBuzzerIds.push(game.activeQuestion.questionId);
          }
        }

        // Advance only for regular questions — the turn was already advanced
        // (from pickedBy) when the regular question resolved and triggered the
        // bonus. Calling nextTurn again for a bonus answer would skip a player.
        if (!wasBonus) {
          nextTurn(game, pickedBy);
        }
        game.isBonusRound = false;

        setActiveQuestion(game, null);
        game.phase = "playing";
        questionResolved = true;
      } else {
        // Wrong answer. The score delta was applied above before reopening.
        game.activeQuestion.alreadyTried.push(answerer);
        game.activeQuestion.currentAnswerer = null;

        // For bonus rounds: only one shot. If the buzz winner gets it wrong,
        // burn the image and advance — don't reopen for someone else.
        if (wasBonus) {
          if (!game.usedBonusBuzzerIds.includes(game.activeQuestion.questionId)) {
            game.usedBonusBuzzerIds.push(game.activeQuestion.questionId);
          }
          setActiveQuestion(game, null);
          game.isBonusRound = false;
          // Don't call nextTurn — it was already advanced when the regular question resolved.
          game.phase = "playing";
          questionResolved = true;
        } else {
          const remainingEligible = Object.values(game.players).filter(
            (p) => p.id !== game.hostId && !game.activeQuestion!.alreadyTried.includes(p.id),
          );

          if (remainingEligible.length === 0) {
            // Nobody left to try — burn the cell, advance turn.
            markCellUsed(game, aqCategory, aqPoints);
            setActiveQuestion(game, null);
            game.isBonusRound = false;
            nextTurn(game);
            game.phase = "playing";
            questionResolved = true;
          } else {
            // Arm buzzers for remaining eligible players.
            armBuzzers(io, game, "buzzing");
          }
        }
      }

      // Emit sound/flash cue to all clients.
      io.to(`game:${gameId}`).emit("judge_result", { correct: parsed.data.correct });
      io.to(`spectator:${gameId}`).emit("judge_result", { correct: parsed.data.correct });

      // ── Game-over check ──────────────────────────────────────────────────
      if (questionResolved) {
        if (wasBonus) finishGameIfOver(game);
        else finishResolvedRegularQuestion(game, pickedBy);
      }

      broadcastAll(io, game);
    });

    // ── misc host controls ────────────────────────────────────────────────

    socket.on("host:set_turn", (payload: unknown) => {
      const parsed = SetTurnPayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (!game.players[parsed.data.playerId]) return;
      if (parsed.data.playerId === game.hostId) return;
      game.currentTurn = parsed.data.playerId;
      broadcastAll(io, game);
    });

    socket.on("host:adjust_score", (payload: unknown) => {
      const parsed = AdjustScorePayload.safeParse(payload);
      if (!parsed.success) return;
      const gameId = socket.data.gameId;
      if (!gameId) return;
      const game = getGame(gameId);
      if (!game || !isHost(socket, game)) return;
      if (parsed.data.playerId === game.hostId || !game.players[parsed.data.playerId]) return;

      awardPoints(game, parsed.data.playerId, parsed.data.delta);
      if (game.phase === "finished") {
        game.winnerId = checkGameOver(game);
      }
      broadcastAll(io, game);
    });

    // ── disconnect ────────────────────────────────────────────────────────

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      const gameId = socket.data.gameId;
      if (!gameId || !socket.data.userId) return;
      const game = getGame(gameId);
      if (!game) return;

      // Was this the user's last open socket? If so they're truly offline.
      const remaining = untrackUserSocket(gameId, socket.data.userId, socket.id);
      const player = game.players[socket.data.userId];

      // No more elimination — everyone stays in the game. On true disconnect,
      // just flip the connected flag so the lobby greys them out / camera
      // tile shows "offline".
      if (player && remaining === 0 && player.connected) {
        setPlayerConnected(game, socket.data.userId, false);
        broadcastAll(io, game);
      }
    });
  });
}
