const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2567";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur serveur.");
  return data;
}

export async function apiMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await jsonOrThrow(res)).user;
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  return (await jsonOrThrow(res)).user;
}

export async function apiLogout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function apiWsTicket(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/ws-ticket`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.ticket ?? null;
}
