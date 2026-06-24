import { useState } from "react";
import { Link } from "react-router-dom";
import type { Room } from "colyseus.js";
import { colyseus } from "../../lib/colyseus";
import "./MaillonFaible.css";

const ROOM = "maillon-faible";

interface PlayerView {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
}

export function MaillonFaiblePage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [phase, setPhase] = useState("lobby");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = players.find((p) => p.id === room?.sessionId);
  const isHost = me?.isHost ?? false;

  function bind(joined: Room) {
    setRoom(joined);
    setError(null);

    joined.onStateChange((state: any) => {
      setPhase(state.phase);
      const list: PlayerView[] = [];
      state.players.forEach((p: any, id: string) => {
        list.push({ id, name: p.name, isHost: p.isHost, connected: p.connected });
      });
      setPlayers(list);
    });

    joined.onError((_code, message) => setError(message ?? "Erreur serveur"));
    joined.onLeave(() => {
      setRoom(null);
      setPlayers([]);
      setPhase("lobby");
    });
  }

  async function createGame() {
    setBusy(true);
    setError(null);
    try {
      const joined = await colyseus.create(ROOM, { name: name || "Joueur" });
      bind(joined);
    } catch (e) {
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
      const joined = await colyseus.joinById(code.trim(), { name: name || "Joueur" });
      bind(joined);
    } catch (e) {
      setError("Code invalide ou partie introuvable.");
    } finally {
      setBusy(false);
    }
  }

  function startGame() {
    room?.send("start");
  }

  function leave() {
    room?.leave();
  }

  return (
    <main className="mf">
      <nav className="mf__nav">
        <Link to="/" className="mf__back">&larr; Accueil</Link>
        <h1 className="mf__title">Le Maillon Faible</h1>
      </nav>

      {error && <p className="mf__error">{error}</p>}

      {!room ? (
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
      ) : (
        <section className="mf__panel">
          <div className="mf__room-code">
            Code a partager : <strong>{room.roomId}</strong>
          </div>

          <p className="mf__phase">Phase : {phase}</p>

          <ul className="mf__players">
            {players.map((p) => (
              <li key={p.id} className={p.connected ? "" : "mf__player--off"}>
                {p.name}
                {p.isHost && <span className="mf__tag">Hote</span>}
                {p.id === room.sessionId && <span className="mf__tag mf__tag--me">Vous</span>}
              </li>
            ))}
          </ul>

          <div className="mf__actions">
            {isHost && phase === "lobby" && (
              <button className="mf__btn mf__btn--primary" onClick={startGame}>
                Demarrer la partie
              </button>
            )}
            <button className="mf__btn" onClick={leave}>
              Quitter
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
