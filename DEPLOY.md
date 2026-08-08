# Deploy

This is the live QuizDuell app. It uses a custom Node server because Socket.IO
shares the HTTP server with Next.js.

## Required Environment Variables

```txt
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
AUTH_SECRET
NEXTAUTH_URL=https://quiz.lauchgruen.de
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.lauchgruen.de
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
PORT=3000
HOSTNAME=0.0.0.0
```

Register the Twitch app callback:

```txt
https://quiz.lauchgruen.de/api/auth/callback/twitch
```

## Docker Compose

```bash
cp .env.production.example .env
# edit .env
# edit livekit.yaml and set the same LIVEKIT_API_SECRET under keys.quizduell
docker compose up -d
```

`docker-compose.yml` starts two containers:

```txt
lauchgruen-quizz-app      Next.js + Socket.IO quiz app on host port 3000
lauchgruen-quizz-livekit  LiveKit SFU on host ports 7880/tcp, 7881/tcp, 50000-60000/udp
```

The Quiz container exposes `/api/health` for health checks. It talks to LiveKit
only for token generation; the WebRTC media server runs as its own service.

## LiveKit SFU

For local testing, start a development LiveKit server:

```bash
docker compose -f docker-compose.livekit.yml up
```

The dev server uses:

```txt
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

The local config pins `rtc.node_ip` to `127.0.0.1` so browsers on the same
Windows machine receive reachable ICE candidates instead of Docker-internal
container addresses.

On the production host, run LiveKit beside the quiz app and expose:

```txt
7880/tcp                 # WebSocket/API, usually behind Caddy as livekit.lauchgruen.de
7881/tcp                 # WebRTC TCP fallback
50000-60000/udp          # WebRTC media; local dev uses 50100-50200/udp
```

Use the same `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in the LiveKit server
config and in this app.

## Local Testing

```txt
http://localhost:4000
```

Register this local Twitch callback:

```txt
http://localhost:4000/api/auth/callback/twitch
```

## Caddy

```txt
quiz.lauchgruen.de {
    reverse_proxy localhost:3000
}

livekit.lauchgruen.de {
    reverse_proxy localhost:7880
}
```
