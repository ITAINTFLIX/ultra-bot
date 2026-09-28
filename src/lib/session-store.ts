import { randomUUID } from "crypto";
import {
  AccountSnapshot,
  BotSettings,
  DEFAULT_SETTINGS,
  LogEntry,
  PositionInfo,
  SessionState,
} from "./types";

/**
 * In-memory session store (v0).
 * Threat model: credentials live only in process memory for the active session.
 * No disk persistence of passwords. Restart clears everything.
 * Do not deploy multi-tenant without encryption-at-rest + auth.
 */

interface InternalSession extends SessionState {
  password?: string; // kept in memory only; never serialized to client
  login?: string;
  server?: string;
  accountId?: string; // MetaApi account id when live
}

const g = globalThis as unknown as {
  __ultraSessions?: Map<string, InternalSession>;
  __ultraActiveId?: string | null;
};

function sessions(): Map<string, InternalSession> {
  if (!g.__ultraSessions) g.__ultraSessions = new Map();
  return g.__ultraSessions;
}

export function getActiveSessionId(): string | null {
  return g.__ultraActiveId ?? null;
}

export function setActiveSessionId(id: string | null) {
  g.__ultraActiveId = id;
}

export function createSession(partial?: Partial<InternalSession>): InternalSession {
  const sessionId = randomUUID();
  const session: InternalSession = {
    sessionId,
    status: "idle",
    mode: process.env.METAAPI_TOKEN ? "live" : "demo_sim",
    connected: false,
    symbol: DEFAULT_SETTINGS.symbol,
    positions: [],
    settings: { ...DEFAULT_SETTINGS },
    logs: [],
    sessionStartEquity: 0,
    dailyPnl: 0,
    tradesToday: 0,
    botRunning: false,
    ...partial,
  };
  sessions().set(sessionId, session);
  setActiveSessionId(sessionId);
  return session;
}

export function getSession(id?: string | null): InternalSession | null {
  const sid = id || getActiveSessionId();
  if (!sid) return null;
  return sessions().get(sid) ?? null;
}

export function getOrCreateSession(): InternalSession {
  const existing = getSession();
  if (existing) return existing;
  return createSession();
}

export function updateSession(id: string, patch: Partial<InternalSession>): InternalSession | null {
  const s = sessions().get(id);
  if (!s) return null;
  Object.assign(s, patch);
  return s;
}

export function destroySession(id: string) {
  sessions().delete(id);
  if (getActiveSessionId() === id) setActiveSessionId(null);
}

export function addLog(
  session: InternalSession,
  level: LogEntry["level"],
  message: string
): LogEntry {
  const entry: LogEntry = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    level,
    message,
  };
  session.logs.push(entry);
  if (session.logs.length > 300) {
    session.logs = session.logs.slice(-250);
  }
  return entry;
}

/** Safe client-facing snapshot — never includes password. */
export function publicSession(session: InternalSession) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    mode: session.mode,
    connected: session.connected,
    account: session.account,
    symbol: session.symbol,
    positions: session.positions,
    settings: session.settings,
    logs: session.logs,
    sessionStartEquity: session.sessionStartEquity,
    dailyPnl: session.dailyPnl,
    tradesToday: session.tradesToday,
    lastSignal: session.lastSignal,
    lastError: session.lastError,
    botRunning: session.botRunning,
    lastPrice: session.lastPrice,
    cooldownUntil: session.cooldownUntil,
    login: session.login,
    server: session.server,
  };
}

export type { InternalSession, AccountSnapshot, PositionInfo, BotSettings };
