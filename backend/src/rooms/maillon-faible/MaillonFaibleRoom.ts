import { Room, Client } from "@colyseus/core";
import { MaillonFaibleState, Player } from "./state";

interface JoinOptions {
  name?: string;
}

export class MaillonFaibleRoom extends Room<MaillonFaibleState> {
  maxClients = 8;

  onCreate() {
    this.setState(new MaillonFaibleState());

    this.onMessage("start", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase !== "lobby") return;

      this.state.phase = "question";
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.name = options.name?.trim() || "Joueur";
    player.isHost = this.state.players.size === 0;
    this.state.players.set(client.sessionId, player);

    console.log(`[maillon-faible] ${player.name} a rejoint ${this.roomId}`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = false;

    if (player.isHost) {
      player.isHost = false;
      for (const [, p] of this.state.players) {
        if (p.connected) {
          p.isHost = true;
          break;
        }
      }
    }

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log(`[maillon-faible] Room ${this.roomId} fermee`);
  }
}
