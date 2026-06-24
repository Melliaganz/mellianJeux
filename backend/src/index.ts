import { NODE_ENV } from "./config/env";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { registerRooms } from "./rooms/registry";
import { loadQuestions } from "./db/questionsRepository";
import { authRouter } from "./auth/routes";

const port = Number(process.env.PORT) || 2567;

async function main() {
  const { count, source } = await loadQuestions();
  console.log(`[Mellianjeux] environnement : ${NODE_ENV}`);
  console.log(`[Mellianjeux] ${count} questions chargees (${source})`);

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "mellianjeux-backend" });
  });

  app.use("/auth", authRouter);
  app.use("/colyseus", monitor());

  const httpServer = createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  registerRooms(gameServer);

  gameServer.listen(port);
  console.log(`[Mellianjeux] Serveur de jeu pret sur http://localhost:${port}`);
  console.log(`[Mellianjeux] Monitor : http://localhost:${port}/colyseus`);
}

main();
