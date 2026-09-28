import { NextRequest, NextResponse } from "next/server";
import { getSession, publicSession, addLog } from "@/lib/session-store";
import { startEngine } from "@/lib/ultra-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId as string | undefined;
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ ok: false, error: "No session — connect first" }, { status: 400 });
    }
    if (!session.connected) {
      return NextResponse.json({ ok: false, error: "Not connected" }, { status: 400 });
    }

    const result = startEngine(session.sessionId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    addLog(session, "info", "Start Bot requested from UI");
    return NextResponse.json({ ok: true, session: publicSession(session) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
