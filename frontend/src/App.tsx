import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { GAMES } from "./games/registry";
import { AuthProvider } from "./auth/AuthContext";
import { AuthPage } from "./auth/AuthPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/connexion" element={<AuthPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
