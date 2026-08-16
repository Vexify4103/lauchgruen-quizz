import { NextResponse } from "next/server";
import { gamePersistenceHealth } from "@/server/game-persistence";

export async function GET() {
  try {
    const persistence = await gamePersistenceHealth();
    return NextResponse.json({ status: "ok", persistence, timestamp: Date.now() });
  } catch (error) {
    console.error("[health] MongoDB persistence unavailable", error);
    return NextResponse.json(
      { status: "degraded", persistence: "unavailable", timestamp: Date.now() },
      { status: 503 },
    );
  }
}
