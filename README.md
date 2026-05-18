# QuizDuell

Real-time browser gameshow app for invited Twitch stream events.

- 1 host plus invited participants
- Twitch OAuth for identity
- Socket.IO for live game state and buzzer events
- LiveKit SFU video rooms for browser camera streams
- OBS browser-source route at `/obs/{gameId}`

This app lives separately from the always-on public site in `../Web`.

## Quick Start

```bash
pnpm install
cp .env.example .env.local
docker compose -f docker-compose.livekit.yml up -d
pnpm dev
```

Local URL:

```txt
http://localhost:3001
```

Register a Twitch OAuth callback:

```txt
http://localhost:3001/api/auth/callback/twitch
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Sign in, host, or join a game |
| `/lobby/{gameId}` | Pre-game waiting room |
| `/host/{gameId}` | Host board and controls |
| `/play/{gameId}` | Participant board and buzzer |
| `/obs/{gameId}` | OBS browser-source layout |

## Architecture

```txt
server.ts
├── Next.js   HTTP, SSR, OAuth callbacks
├── Socket.IO live game state and buzzer events
└── LiveKit token API for SFU camera rooms
```

The server owns the in-memory game state. Restarting the process ends active
games.
