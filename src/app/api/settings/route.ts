import { NextRequest, NextResponse } from "next/server";
import { addLog, getSession, publicSession } from "@/lib/session-store";
import { BotSettings, DEFAULT_SETTINGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  return NextResponse.json({
    ok: true,
    settings: session?.settings ?? DEFAULT_SETTINGS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ ok: false, error: "No session — connect first" }, { status: 400 });
    }

    const patch = body.settings as Partial<BotSettings>;
    const next: BotSettings = { ...session.settings };

    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    if (patch.lotSize != null) next.lotSize = Math.max(0.01, num(patch.lotSize, next.lotSize));
    if (patch.basketSize != null) next.basketSize = Math.min(20, Math.max(1, Math.round(num(patch.basketSize, next.basketSize))));
    if (patch.tpPoints != null) next.tpPoints = Math.max(1, num(patch.tpPoints, next.tpPoints));
    if (patch.slPoints != null) next.slPoints = Math.max(1, num(patch.slPoints, next.slPoints));
    if (patch.profitTargetUsd != null) next.profitTargetUsd = Math.max(0, num(patch.profitTargetUsd, next.profitTargetUsd));
    if (patch.profitTargetPct != null) next.profitTargetPct = Math.max(0, num(patch.profitTargetPct, next.profitTargetPct));
    if (patch.maxDailyLossPct != null) next.maxDailyLossPct = Math.max(1, num(patch.maxDailyLossPct, next.maxDailyLossPct));
    if (patch.maxTradesPerDay != null) next.maxTradesPerDay = Math.max(1, Math.round(num(patch.maxTradesPerDay, next.maxTradesPerDay)));
    if (patch.cooldownSeconds != null) next.cooldownSeconds = Math.max(0, Math.round(num(patch.cooldownSeconds, next.cooldownSeconds)));
    if (patch.symbol != null && String(patch.symbol).trim()) next.symbol = String(patch.symbol).trim();
    if (patch.reenterAfterFlat != null) next.reenterAfterFlat = Boolean(patch.reenterAfterFlat);
    if (patch.stopOnProfitTarget != null) next.stopOnProfitTarget = Boolean(patch.stopOnProfitTarget);

    session.settings = next;
    if (next.symbol) session.symbol = next.symbol;

    addLog(
      session,
      "info",
      `Settings updated: lot=${next.lotSize} basket=${next.basketSize} TP=${next.tpPoints} SL=${next.slPoints} target$=${next.profitTargetUsd}`
    );

    return NextResponse.json({ ok: true, session: publicSession(session) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
