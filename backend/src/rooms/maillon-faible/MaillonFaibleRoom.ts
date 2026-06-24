import { Room, Client } from "@colyseus/core";
import { MaillonFaibleState, Player } from "./state";
import { QUESTIONS, Question } from "./questions";

interface JoinOptions {
  name?: string;
}

const CHAIN = [50, 100, 200, 300, 450, 600, 800, 1000];
const ROUND_SECONDS = 120;

function chainValue(index: number): number {
  if (index <= 0) return 0;
  return CHAIN[Math.min(index, CHAIN.length) - 1];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class MaillonFaibleRoom extends Room<MaillonFaibleState> {
  maxClients = 8;

  private pool: Question[] = [];
  private currentAnswer = "";
  private timerRef?: { clear(): void };

  onCreate() {
    this.setState(new MaillonFaibleState());

    this.onMessage("start", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase === "playing") return;
      if (this.contestants().length === 0) return;

      this.state.phase = "playing";
      this.state.bank = 0;
      this.state.chainIndex = 0;
      this.state.lastResult = "";
      this.state.timeLeft = ROUND_SECONDS;
      this.state.activePlayerId = "";
      this.pool = shuffle([...QUESTIONS]);
      this.nextTurn();
      this.startTimer();
    });

    this.onMessage("bank", (client) => {
      if (this.state.phase !== "playing") return;
      if (client.sessionId !== this.state.activePlayerId) return;
      if (this.state.awaitingValidation) return;
      if (this.state.chainIndex === 0) return;

      this.state.bank += chainValue(this.state.chainIndex);
      this.state.chainIndex = 0;
      this.state.lastResult = "banked";
    });

    this.onMessage("answer", (client, message: { text?: string }) => {
      if (this.state.phase !== "playing") return;
      if (client.sessionId !== this.state.activePlayerId) return;
      if (this.state.awaitingValidation) return;

      this.state.pendingAnswer = (message?.text ?? "").trim();
      this.state.awaitingValidation = true;
    });

    this.onMessage("validate", (client, message: { correct?: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (!this.state.awaitingValidation) return;

      if (message?.correct) {
        this.state.chainIndex++;
        if (this.state.chainIndex >= CHAIN.length) {
          this.state.bank += CHAIN[CHAIN.length - 1];
          this.state.chainIndex = 0;
        }
        this.state.lastResult = "correct";
      } else {
        this.state.chainIndex = 0;
        this.state.lastResult = "incorrect";
      }

      this.state.awaitingValidation = false;
      this.state.pendingAnswer = "";
      this.nextTurn();
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.name = options.name?.trim() || "Joueur";
    player.isHost = this.state.players.size === 0;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const wasHost = player.isHost;
    const wasActive = this.state.activePlayerId === client.sessionId;
    this.state.players.delete(client.sessionId);

    if (wasHost) {
      for (const [, p] of this.state.players) {
        if (p.connected) {
          p.isHost = true;
          break;
        }
      }
      if (this.state.phase === "playing") this.sendAnswerToHost();
    }

    if (this.state.phase === "playing" && wasActive) {
      this.state.awaitingValidation = false;
      this.state.pendingAnswer = "";
      this.nextTurn();
    }
  }

  onDispose() {
    this.timerRef?.clear();
  }

  private contestants(): string[] {
    const ids: string[] = [];
    this.state.players.forEach((p, id) => {
      if (!p.isHost && p.connected) ids.push(id);
    });
    return ids;
  }

  private hostId(): string | undefined {
    let found: string | undefined;
    this.state.players.forEach((p, id) => {
      if (p.isHost && p.connected) found = id;
    });
    return found;
  }

  private sendAnswerToHost() {
    const host = this.clients.find((c) => c.sessionId === this.hostId());
    host?.send("expectedAnswer", { answer: this.currentAnswer });
  }

  private setQuestion() {
    if (this.pool.length === 0) this.pool = shuffle([...QUESTIONS]);
    const q = this.pool.pop()!;
    this.currentAnswer = q.answer;
    this.state.question = q.question;
    this.state.awaitingValidation = false;
    this.state.pendingAnswer = "";
    this.sendAnswerToHost();
  }

  private nextTurn() {
    const ids = this.contestants();
    if (ids.length === 0) {
      this.endRound();
      return;
    }
    const idx = ids.indexOf(this.state.activePlayerId);
    this.state.activePlayerId = ids[(idx + 1) % ids.length];
    this.setQuestion();
  }

  private startTimer() {
    this.timerRef?.clear();
    this.timerRef = this.clock.setInterval(() => {
      this.state.timeLeft--;
      if (this.state.timeLeft <= 0) this.endRound();
    }, 1000);
  }

  private endRound() {
    this.timerRef?.clear();
    this.timerRef = undefined;
    if (this.state.timeLeft < 0) this.state.timeLeft = 0;
    this.state.phase = "ended";
    this.state.activePlayerId = "";
    this.state.question = "";
    this.state.awaitingValidation = false;
    this.state.pendingAnswer = "";
  }
}
