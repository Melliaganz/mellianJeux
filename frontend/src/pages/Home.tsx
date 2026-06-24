import { Link } from "react-router-dom";
import { GAMES, type GameDefinition } from "../games/registry";
import "./Home.css";

export function Home() {
  return (
    <main className="home">
      <header className="home__header">
        <img className="home__logo" src="/assets/logo.png" alt="Les Mellianjeux" />
        <h1 className="home__title">Les Mellianjeux</h1>
        <p className="home__subtitle">Choisissez un jeu</p>
      </header>

      <section className="game-grid">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </section>
    </main>
  );
}

function GameCard({ game }: { game: GameDefinition }) {
  const badge = (
    <span className="game-card__badge" style={{ background: game.accent }}>
      {game.badge}
    </span>
  );

  const content = (
    <>
      {badge}
      <div className="game-card__body">
        <h2 className="game-card__title">{game.title}</h2>
        <p className="game-card__desc">{game.description}</p>
      </div>
      {!game.available && <span className="game-card__soon">Bientot</span>}
    </>
  );

  if (!game.available) {
    return <article className="game-card game-card--disabled">{content}</article>;
  }

  return (
    <Link className="game-card" to={`/jeux/${game.id}`}>
      {content}
    </Link>
  );
}
