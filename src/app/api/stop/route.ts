import { NextRequest, NextResponse } from "next/server";
import { getSession, publicSession } from "@/lib/session-store";
import { stopEngine } from "@/lib/ultra-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId as string | undefined;
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ ok: false, error: "No session" }, { status: 400 });
    }

    stopEngine(session.sessionId, "UI stop");
    return NextResponse.json({ ok: true, session: publicSession(session) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
