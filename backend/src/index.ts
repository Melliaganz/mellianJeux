import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRooms } from "./rooms/registry";

const port = Number(process.env.PORT) || 2567;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mellianjeux-backend" });
});

app.use("/colyseus", monitor());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

registerRooms(gameServer);

gameServer.listen(port);
console.log(`[Mellianjeux] Serveur de jeu pret sur http://localhost:${port}`);
console.log(`[Mellianjeux] Monitor : http://localhost:${port}/colyseus`);
