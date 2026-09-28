import { NextRequest, NextResponse } from "next/server";
import { refreshAccount } from "@/lib/metaapi";
import { getOrCreateSession, publicSession } from "@/lib/session-store";
import { isEngineRunning } from "@/lib/ultra-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const session = getOrCreateSession();
  if (sessionId && session.sessionId !== sessionId) {
    // still return active if mismatch in v0 single-session
  }

  if (session.connected) {
    try {
      await refreshAccount(session);
    } catch {
      /* ignore */
    }
  }

  session.botRunning = isEngineRunning(session.sessionId) || session.botRunning;

  return NextResponse.json({ ok: true, session: publicSession(session) });
}
