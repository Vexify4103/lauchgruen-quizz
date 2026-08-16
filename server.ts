import { createServer } from "node:http";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket";
import {
  closeGamePersistence,
  flushGamePersistence,
} from "./src/server/game-persistence";

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

// In production bind to all interfaces so the server is reachable from outside.
// Override with HOSTNAME env var if needed (e.g. HOSTNAME=127.0.0.1 for local dev behind a proxy).
const hostname = process.env.HOSTNAME ?? (dev ? "localhost" : "0.0.0.0");
const port = Number(process.env.PORT ?? (dev ? 4000 : 3000));

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function start() {
  await app.prepare();
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: dev ? "*" : false },
  });

  await registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Quiz ready on http://${hostname}:${port}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received; flushing game state`);

    io.close();
    httpServer.close();
    await flushGamePersistence();
    await closeGamePersistence();
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

void start().catch((error) => {
  console.error("[server] startup failed", error);
  process.exit(1);
});
