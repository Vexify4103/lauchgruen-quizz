export function liveKitRoomName(gameId: string): string {
  return `quizduell-${gameId}`;
}

export function liveKitPublicUrl(): string | null {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL ?? null;
}

export function liveKitServerConfig():
  | { url: string; apiKey: string; apiSecret: string }
  | null {
  const url = liveKitPublicUrl();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}
