import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { GAMES } from "./games/registry";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {GAMES.filter((game) => game.available).map((game) => {
          const GameComponent = game.component;
          return (
            <Route
              key={game.id}
              path={`/jeux/${game.id}`}
              element={<GameComponent />}
            />
          );
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
