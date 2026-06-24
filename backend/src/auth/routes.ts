import { Router, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { isProd } from "../config/env";
import { hashPassword, verifyPassword } from "./password";
import { createSession, resolveSession, deleteSession } from "./sessions";
import { issueTicket } from "./wsTickets";

export const SESSION_COOKIE = "mj_session";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD = 8;

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    expires: expiresAt,
    path: "/",
  });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const displayName = String(req.body?.displayName ?? "").trim();

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Champs manquants." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Mot de passe trop court (${MIN_PASSWORD} caracteres minimum).` });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return res.status(409).json({ error: "Cet email est deja utilise." });
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(users)
    .values({ email, passwordHash, displayName })
    .returning({ id: users.id, email: users.email, displayName: users.displayName });
  const user = inserted[0];

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.status(201).json({ user });
});

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);
  res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await deleteSession(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ user: null });
  const user = await resolveSession(token);
  if (!user) return res.status(401).json({ user: null });
  res.json({ user });
});

authRouter.get("/ws-ticket", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: "Non authentifie." });
  const user = await resolveSession(token);
  if (!user) return res.status(401).json({ error: "Non authentifie." });
  res.json({ ticket: issueTicket(user) });
});
