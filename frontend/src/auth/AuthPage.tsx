import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./auth.css";

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <nav className="auth__nav">
        <Link to="/" className="auth__back">&larr; Accueil</Link>
      </nav>

      <section className="auth__card">
        <h1 className="auth__title">{mode === "login" ? "Connexion" : "Creer un compte"}</h1>

        <div className="auth__tabs">
          <button
            className={mode === "login" ? "auth__tab auth__tab--on" : "auth__tab"}
            onClick={() => setMode("login")}
            type="button"
          >
            Se connecter
          </button>
          <button
            className={mode === "register" ? "auth__tab auth__tab--on" : "auth__tab"}
            onClick={() => setMode("register")}
            type="button"
          >
            S'inscrire
          </button>
        </div>

        {error && <p className="auth__error">{error}</p>}

        <form className="auth__form" onSubmit={submit}>
          {mode === "register" && (
            <label className="auth__field">
              <span>Pseudo affiche</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Lucas"
                maxLength={20}
                required
              />
            </label>
          )}
          <label className="auth__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              autoComplete="email"
              required
            />
          </label>
          <label className="auth__field">
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "8 caracteres minimum" : ""}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          <button className="auth__submit" type="submit" disabled={busy}>
            {mode === "login" ? "Se connecter" : "Creer le compte"}
          </button>
        </form>
      </section>
    </main>
  );
}
