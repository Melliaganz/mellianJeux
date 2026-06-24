import { Room, Client } from "@colyseus/core";
import { MaillonFaibleState, Player } from "./state";
import { Question } from "./questions";
import { getQuestions } from "../../db/questionsRepository";
import { consumeTicket } from "../../auth/wsTickets";
import type { SessionUser } from "../../auth/sessions";

interface JoinOptions {
  name?: string;
  ticket?: string;
}

const CHAIN = [50, 100, 200, 300, 450, 600, 800, 1000];
const BASE_SECONDS = 120;
const STEP_SECONDS = 20;
const MIN_SECONDS = 45;

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
  private baseSeconds = BASE_SECONDS;

  onCreate(options: { roundSeconds?: number }) {
    if (options?.roundSeconds && options.roundSeconds > 0) {
      this.baseSeconds = options.roundSeconds;
    }
    this.setState(new MaillonFaibleState());

    this.onMessage("start", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase === "playing" || this.state.phase === "vote") return;
      this.startGame();
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

    this.onMessage("vote", (client, message: { targetId?: string }) => {
      if (this.state.phase !== "vote") return;
      const voter = this.state.players.get(client.sessionId);
      if (!this.isActiveContestant(voter)) return;
      const targetId = message?.targetId ?? "";
      if (targetId === client.sessionId) return;
      const target = this.state.players.get(targetId);
      if (!this.isActiveContestant(target)) return;

      voter!.votedFor = targetId;
      if (this.allVotesIn()) this.tally();
    });

    this.onMessage("revealVotes", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase !== "vote") return;
      this.tally();
    });

    this.onMessage("continue", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase !== "reveal") return;

      if (this.contestants().length >= 2) {
        this.beginRound(this.state.roundNumber + 1);
      } else {
        this.state.phase = "ended";
      }
    });
  }

  onAuth(_client: Client, options: JoinOptions): SessionUser | true {
    if (options?.ticket) {
      const user = consumeTicket(options.ticket);
      if (user) return user;
    }
    return true;
  }

  onJoin(client: Client, options: JoinOptions) {
    const account =
      client.auth && typeof client.auth === "object" ? (client.auth as SessionUser) : null;
    const player = new Player();
    player.name = account?.displayName || options.name?.trim() || "Joueur";
    player.authenticated = !!account;
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

    if (this.state.phase === "vote" && this.allVotesIn()) this.tally();
  }

  onDispose() {
    this.timerRef?.clear();
  }

  private startGame() {
    this.state.total = 0;
    this.state.players.forEach((p) => {
      p.eliminated = false;
      p.votedFor = "";
      p.votes = 0;
    });
    if (this.contestants().length === 0) return;
    this.beginRound(1);
  }

  private beginRound(roundNumber: number) {
    this.state.roundNumber = roundNumber;
    this.state.phase = "playing";
    this.state.bank = 0;
    this.state.chainIndex = 0;
    this.state.lastResult = "";
    this.state.eliminatedId = "";
    this.state.eliminatedName = "";
    this.state.timeLeft = this.roundTime(roundNumber);
    this.state.players.forEach((p) => {
      p.votedFor = "";
      p.votes = 0;
    });
    this.pool = shuffle([...getQuestions()]);
    this.state.activePlayerId = "";
    this.nextTurn();
    this.startTimer();
  }

  private endRound() {
    this.timerRef?.clear();
    this.timerRef = undefined;
    if (this.state.timeLeft < 0) this.state.timeLeft = 0;
    this.state.total += this.state.bank;
    this.state.activePlayerId = "";
    this.state.question = "";
    this.state.awaitingValidation = false;
    this.state.pendingAnswer = "";

    if (this.contestants().length <= 1) {
      this.state.phase = "ended";
      return;
    }

    this.state.players.forEach((p) => {
      p.votedFor = "";
      p.votes = 0;
    });
    this.state.phase = "vote";
  }

  private tally() {
    const ids = this.contestants();
    const counts = new Map<string, number>();
    ids.forEach((id) => counts.set(id, 0));
    ids.forEach((id) => {
      const target = this.state.players.get(id)!.votedFor;
      if (counts.has(target)) counts.set(target, counts.get(target)! + 1);
    });

    let max = -1;
    counts.forEach((c) => {
      if (c > max) max = c;
    });
    const tied = ids.filter((id) => counts.get(id) === max);
    const eliminatedId = tied[Math.floor(Math.random() * tied.length)];

    this.state.players.forEach((p, id) => {
      p.votes = counts.get(id) ?? 0;
    });

    const eliminated = this.state.players.get(eliminatedId)!;
    eliminated.eliminated = true;
    this.state.eliminatedId = eliminatedId;
    this.state.eliminatedName = eliminated.name;
    this.state.phase = "reveal";
  }

  private isActiveContestant(p?: Player): boolean {
    return !!p && !p.isHost && p.connected && !p.eliminated;
  }

  private allVotesIn(): boolean {
    const ids = this.contestants();
    if (ids.length === 0) return false;
    return ids.every((id) => this.state.players.get(id)!.votedFor !== "");
  }

  private contestants(): string[] {
    const ids: string[] = [];
    this.state.players.forEach((p, id) => {
      if (!p.isHost && p.connected && !p.eliminated) ids.push(id);
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
    if (this.pool.length === 0) this.pool = shuffle([...getQuestions()]);
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

  private roundTime(roundNumber: number): number {
    const floor = Math.min(MIN_SECONDS, this.baseSeconds);
    return Math.max(this.baseSeconds - (roundNumber - 1) * STEP_SECONDS, floor);
  }

  private startTimer() {
    this.timerRef?.clear();
    this.timerRef = this.clock.setInterval(() => {
      this.state.timeLeft--;
      if (this.state.timeLeft <= 0) this.endRound();
    }, 1000);
  }
}
