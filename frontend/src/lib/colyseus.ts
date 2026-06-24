import { Client } from "colyseus.js";

const endpoint =
  import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";

export const colyseus = new Client(endpoint);
