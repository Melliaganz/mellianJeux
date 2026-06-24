import { Server } from "@colyseus/core";
import { MaillonFaibleRoom } from "./maillon-faible/MaillonFaibleRoom";

export function registerRooms(gameServer: Server) {
  gameServer.define("maillon-faible", MaillonFaibleRoom);
}
