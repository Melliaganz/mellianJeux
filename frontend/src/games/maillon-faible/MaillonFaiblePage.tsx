import { useState } from "react";
import { Link } from "react-router-dom";
import type { Room } from "colyseus.js";
import { colyseus } from "../../lib/colyseus";
import "./MaillonFaible.css";

const ROOM = "maillon-faible";
const CHAIN = [50, 100, 200, 300, 450, 600, 800, 1000];

interface PlayerView {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
}

interface GameView {
  phase: string;
  bank: number;
  timeLeft: number;
  chainIndex: number;
  activePlayerId: string;
  question: string;
  awaitingValidation: boolean;
  pendingAnswer: string;
  lastResult: string;
}

const EMPTY: GameView = {
  phase: "lobby",
  bank: 0,
  timeLeft: 0,
  chainIndex: 0,
  activePlayerId: "",
  question: "",
  awaitingValidation: false,
  pendingAnswer: "",
  lastResult: "",
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function MaillonFaiblePage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [view, setView] = useState<GameView>(EMPTY);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = players.find((p) => p.id === room?.sessionId);
  const isHost = me?.isHost ?? false;
  const isActive = room?.sessionId === view.activePlayerId;
  const activeName = players.find((p) => p.id === view.activePlayerId)?.name ?? "";
  const contestants = players.filter((p) => !p.isHost && p.connected).length;

  function bind(joined: Room) {
    setRoom(joined);
    setError(null);
    setView(EMPTY);
    setExpectedAnswer("");

    joined.onStateChange((state: any) => {
      setView({
        phase: state.phase,
        bank: state.bank,
        timeLeft: state.timeLeft,
        chainIndex: state.chainIndex,
        activePlayerId: state.activePlayerId,
        question: state.question,
        awaitingValidation: state.awaitingValidation,
        pendingAnswer: state.pendingAnswer,
        lastResult: state.lastResult,
      });
      const list: PlayerView[] = [];
      state.players.forEach((p: any, id: string) => {
        list.push({ id, name: p.name, isHost: p.isHost, connected: p.connected });
      });
      setPlayers(list);
    });

    joined.onMessage("expectedAnswer", (m: { answer: string }) => {
      setExpectedAnswer(m.answer);
    });

    joined.onError((_c, message) => setError(message ?? "Erreur serveur"));
    joined.onLeave(() => {
      setRoom(null);
      setPlayers([]);
      setView(EMPTY);
    });
  }

  async function createGame() {
    setBusy(true);
    setError(null);
    try {
      bind(await colyseus.create(ROOM, { name: name || "Joueur" }));
    } catch {
      setError("Impossible de creer la partie. Le serveur est-il demarre ?");
    } finally {
      setBusy(false);
    }
  }

  async function joinGame() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      bind(await colyseus.joinById(code.trim(), { name: name || "Joueur" }));
    } catch {
      setError("Code invalide ou partie introuvable.");
    } finally {
      setBusy(false);
    }
  }

  function submitAnswer() {
    room?.send("answer", { text: answerText });
    setAnswerText("");
  }

  return (
    <main className="mf">
      <nav className="mf__nav">
        <Link to="/" className="mf__back">&larr; Accueil</Link>
        <h1 className="mf__title">Le Maillon Faible</h1>
      </nav>

      {error && <p className="mf__error">{error}</p>}

      {!room && (
        <section className="mf__panel">
          <label className="mf__field">
            <span>Votre pseudo</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Joueur"
              maxLength={20}
            />
          </label>
          <div className="mf__actions">
            <button className="mf__btn mf__btn--primary" onClick={createGame} disabled={busy}>
              Creer une partie privee
            </button>
            <div className="mf__join">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code de la partie"
              />
              <button className="mf__btn" onClick={joinGame} disabled={busy || !code.trim()}>
                Rejoindre
              </button>
            </div>
          </div>
        </section>
      )}

      {room && view.phase === "lobby" && (
        <section className="mf__panel">
          <div className="mf__room-code">
            Code a partager : <strong>{room.roomId}</strong>
          </div>
          <PlayerList players={players} sessionId={room.sessionId} activeId="" />
          <p className="mf__hint">
            {isHost
              ? "Vous etes l'animateur. Au moins un concurrent doit rejoindre pour lancer la manche."
              : "Vous etes concurrent. En attente du lancement par l'animateur."}
          </p>
          <div className="mf__actions">
            {isHost && (
              <button
                className="mf__btn mf__btn--primary"
                onClick={() => room.send("start")}
                disabled={contestants < 1}
              >
                Lancer la manche
              </button>
            )}
            <button className="mf__btn" onClick={() => room.leave()}>
              Quitter
            </button>
          </div>
        </section>
      )}

      {room && view.phase === "playing" && (
        <section className="mf__panel">
          <div className="mf__hud">
            <span className="mf__timer">{formatTime(view.timeLeft)}</span>
            <span className="mf__banktotal">Banque : {view.bank} EUR</span>
          </div>

          <Ladder index={view.chainIndex} />

          <p className="mf__turn">
            Au tour de <strong>{activeName}</strong>
          </p>

          <div className="mf__question">{view.question}</div>

          {view.lastResult && <ResultBadge result={view.lastResult} />}

          {isHost ? (
            <div className="mf__animateur">
              <p className="mf__expected">
                Reponse attendue : <strong>{expectedAnswer}</strong>
              </p>
              {view.awaitingValidation ? (
                <>
                  <p className="mf__given">
                    Reponse donnee : <strong>{view.pendingAnswer || "(vide)"}</strong>
                  </p>
                  <div className="mf__actions mf__actions--row">
                    <button
                      className="mf__btn mf__btn--ok"
                      onClick={() => room.send("validate", { correct: true })}
                    >
                      Correct
                    </button>
                    <button
                      className="mf__btn mf__btn--ko"
                      onClick={() => room.send("validate", { correct: false })}
                    >
                      Incorrect
                    </button>
                  </div>
                </>
              ) : (
                <p className="mf__hint">En attente de la reponse de {activeName}.</p>
              )}
            </div>
          ) : isActive ? (
            <div className="mf__answerbox">
              {view.awaitingValidation ? (
                <p className="mf__hint">Reponse envoyee. En attente de validation.</p>
              ) : (
                <>
                  <div className="mf__join">
                    <input
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                      placeholder="Votre reponse"
                      autoFocus
                    />
                    <button className="mf__btn mf__btn--primary" onClick={submitAnswer}>
                      Repondre
                    </button>
                  </div>
                  <button
                    className="mf__btn mf__btn--bank"
                    onClick={() => room.send("bank")}
                    disabled={view.chainIndex === 0}
                  >
                    Banque ({chainAt(view.chainIndex)} EUR)
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="mf__hint">En attente du tour de {activeName}.</p>
          )}

          <div className="mf__actions">
            <PlayerList players={players} sessionId={room.sessionId} activeId={view.activePlayerId} />
            <button className="mf__btn" onClick={() => room.leave()}>
              Quitter
            </button>
          </div>
        </section>
      )}

      {room && view.phase === "ended" && (
        <section className="mf__panel">
          <h2 className="mf__endtitle">Manche terminee</h2>
          <p className="mf__endbank">Banque : {view.bank} EUR</p>
          <PlayerList players={players} sessionId={room.sessionId} activeId="" />
          <div className="mf__actions">
            {isHost && (
              <button
                className="mf__btn mf__btn--primary"
                onClick={() => room.send("start")}
                disabled={contestants < 1}
              >
                Rejouer une manche
              </button>
            )}
            <button className="mf__btn" onClick={() => room.leave()}>
              Quitter
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function chainAt(index: number): number {
  if (index <= 0) return 0;
  return CHAIN[Math.min(index, CHAIN.length) - 1];
}

function Ladder({ index }: { index: number }) {
  return (
    <ol className="mf__ladder">
      {CHAIN.map((value, i) => (
        <li key={value} className={i < index ? "mf__rung mf__rung--on" : "mf__rung"}>
          {value}
        </li>
      ))}
    </ol>
  );
}

function ResultBadge({ result }: { result: string }) {
  const label =
    result === "correct"
      ? "Bonne reponse"
      : result === "incorrect"
        ? "Mauvaise reponse, chaine cassee"
        : result === "banked"
          ? "Banque !"
          : "";
  if (!label) return null;
  return <p className={`mf__result mf__result--${result}`}>{label}</p>;
}

function PlayerList({
  players,
  sessionId,
  activeId,
}: {
  players: PlayerView[];
  sessionId?: string;
  activeId: string;
}) {
  return (
    <ul className="mf__players">
      {players.map((p) => (
        <li
          key={p.id}
          className={[
            p.connected ? "" : "mf__player--off",
            p.id === activeId ? "mf__player--active" : "",
          ].join(" ")}
        >
          {p.name}
          {p.isHost && <span className="mf__tag">Animateur</span>}
          {p.id === sessionId && <span className="mf__tag mf__tag--me">Vous</span>}
        </li>
      ))}
    </ul>
  );
}
