import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/lib/auth";
import { getGame } from "@/server/game-state";
import { liveKitRoomName, liveKitServerConfig } from "@/lib/livekit";

export const runtime = "nodejs";

const TOKEN_TTL = "4h";

export async function GET(request: Request) {
  const config = liveKitServerConfig();
  if (!config) {
    return NextResponse.json(
      { error: "livekit_not_configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const gameId = url.searchParams.get("gameId")?.trim();
  const role = url.searchParams.get("role") === "viewer" ? "viewer" : "publisher";

  if (!gameId) {
    return NextResponse.json({ error: "missing_game_id" }, { status: 400 });
  }

  const game = getGame(gameId);
  if (!game) {
    return NextResponse.json({ error: "game_not_found" }, { status: 404 });
  }

  const session = await auth();
  const user = session?.user;
  const canPublish = role === "publisher";

  if (canPublish && !user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (canPublish && user?.id && !game.players[user.id]) {
    return NextResponse.json({ error: "not_in_game" }, { status: 403 });
  }

  const identity = canPublish
    ? user!.id
    : `viewer-${gameId}-${randomUUID()}`;
  const name = canPublish
    ? user!.name ?? user!.twitchLogin ?? "Player"
    : "OBS Viewer";
  const room = liveKitRoomName(gameId);

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    ttl: TOKEN_TTL,
    metadata: JSON.stringify({ gameId, role }),
  });

  token.addGrant({
    room,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: false,
  });

  return NextResponse.json({
    token: await token.toJwt(),
    url: config.url,
    room,
    identity,
  });
}
