import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./auth.css";

export function AuthBar() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="authbar" />;

  return (
    <div className="authbar">
      {user ? (
        <>
          <span className="authbar__name">Bonjour {user.displayName}</span>
          <button className="authbar__btn" onClick={() => logout()}>
            Deconnexion
          </button>
        </>
      ) : (
        <Link className="authbar__btn" to="/connexion">
          Se connecter
        </Link>
      )}
    </div>
  );
}
