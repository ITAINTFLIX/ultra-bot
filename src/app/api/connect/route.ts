import { NextRequest, NextResponse } from "next/server";
import { connectAccount } from "@/lib/metaapi";
import { addLog, createSession, destroySession, getActiveSessionId, publicSession } from "@/lib/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const login = String(body.login ?? "").trim();
    const password = String(body.password ?? "");
    const server = String(body.server ?? "").trim();

    if (!login || !password || !server) {
      return NextResponse.json(
        { ok: false, error: "login, password, and server are required" },
        { status: 400 }
      );
    }

    // Replace prior session
    const prev = getActiveSessionId();
    if (prev) destroySession(prev);

    const session = createSession();
    // Never log password (not even redacted partials) — login + server only
    addLog(session, "info", `Connect request login=${login} server=${server} password=[REDACTED]`);

    const result = await connectAccount(session, login, password, server);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "connect failed", session: publicSession(session) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, session: publicSession(session) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
