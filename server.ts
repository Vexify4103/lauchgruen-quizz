import { createServer } from "node:http";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket";

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

// In production bind to all interfaces so the server is reachable from outside.
// Override with HOSTNAME env var if needed (e.g. HOSTNAME=127.0.0.1 for local dev behind a proxy).
const hostname = process.env.HOSTNAME ?? (dev ? "localhost" : "0.0.0.0");
const port = Number(process.env.PORT ?? (dev ? 4000 : 3000));

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: dev ? "*" : false },
  });

  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Quiz ready on http://${hostname}:${port}`);
  });
});
