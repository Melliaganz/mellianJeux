import { randomBytes } from "node:crypto";
import type { SessionUser } from "./sessions";

const TICKET_TTL_MS = 60 * 1000;
const tickets = new Map<string, { user: SessionUser; expiresAt: number }>();

export function issueTicket(user: SessionUser): string {
  const ticket = randomBytes(24).toString("hex");
  tickets.set(ticket, { user, expiresAt: Date.now() + TICKET_TTL_MS });
  return ticket;
}

export function consumeTicket(ticket: string): SessionUser | null {
  const entry = tickets.get(ticket);
  if (!entry) return null;
  tickets.delete(ticket);
  if (entry.expiresAt < Date.now()) return null;
  return entry.user;
}

setInterval(() => {
  const now = Date.now();
  for (const [ticket, entry] of tickets) {
    if (entry.expiresAt < now) tickets.delete(ticket);
  }
}, TICKET_TTL_MS).unref();
