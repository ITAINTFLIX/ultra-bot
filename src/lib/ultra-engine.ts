/**
 * Ultra Bot aggressive multi-position gold scalper engine.
 * Signal v0: EMA(9) vs EMA(21) crossover on M1 closes (trend-follow).
 * Basket of N same-direction market orders; equity profit target; daily halt.
 */

import {
  addLog,
  getSession,
  InternalSession,
} from "./session-store";
import {
  checkDemoExits,
  closeAllPositions,
  fetchCandles,
  markDemoPositions,
  openMarketBasket,
  refreshAccount,
} from "./metaapi";

const g = globalThis as unknown as {
  __ultraLoops?: Map<string, { timer: ReturnType<typeof setInterval>; running: boolean }>;
};

function loops() {
  if (!g.__ultraLoops) g.__ultraLoops = new Map();
  return g.__ultraLoops;
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

type Signal = "buy" | "sell" | "flat";

function computeSignal(closes: number[]): Signal {
  if (closes.length < 30) return "flat";
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const i = closes.length - 1;
  const prev = i - 1;
  // crossover
  if (e9[prev] <= e21[prev] && e9[i] > e21[i]) return "buy";
  if (e9[prev] >= e21[prev] && e9[i] < e21[i]) return "sell";
  // hold trend bias if already strongly separated
  const sep = e9[i] - e21[i];
  if (Math.abs(sep) > 0.15) return sep > 0 ? "buy" : "sell";
  return "flat";
}

export function startEngine(sessionId: string): { ok: boolean; error?: string } {
  const session = getSession(sessionId);
  if (!session) return { ok: false, error: "No session" };
  if (!session.connected) return { ok: false, error: "Not connected" };

  const existing = loops().get(sessionId);
  if (existing?.running) {
    return { ok: true };
  }
  if (existing?.timer) clearInterval(existing.timer);

  session.botRunning = true;
  session.status = "running";
  session.sessionStartEquity = session.account?.equity ?? session.sessionStartEquity;
  addLog(session, "info", `Ultra Bot START — mode=${session.mode} symbol=${session.symbol}`);
  addLog(
    session,
    "info",
    `Settings lot=${session.settings.lotSize} basket=${session.settings.basketSize} TP=${session.settings.tpPoints}pts SL=${session.settings.slPoints}pts`
  );

  const timer = setInterval(() => {
    void tick(sessionId);
  }, 2000);

  loops().set(sessionId, { timer, running: true });
  // immediate first tick
  void tick(sessionId);
  return { ok: true };
}

export function stopEngine(sessionId: string, reason = "user stop"): { ok: boolean } {
  const loop = loops().get(sessionId);
  if (loop?.timer) clearInterval(loop.timer);
  loops().set(sessionId, { timer: undefined as unknown as ReturnType<typeof setInterval>, running: false });

  const session = getSession(sessionId);
  if (session) {
    session.botRunning = false;
    session.status = session.connected ? "stopped" : "idle";
    addLog(session, "warn", `Ultra Bot STOP — ${reason}`);
  }
  return { ok: true };
}

export function isEngineRunning(sessionId: string): boolean {
  return Boolean(loops().get(sessionId)?.running);
}

async function tick(sessionId: string) {
  const loop = loops().get(sessionId);
  if (!loop?.running) return;

  const session = getSession(sessionId);
  if (!session || !session.botRunning) return;

  try {
    await refreshAccount(session);

    // Demo: advance fake price each tick
    if (session.mode === "demo_sim") {
      const drift = (Math.random() - 0.48) * 0.4;
      const price = (session.lastPrice ?? 2650) + drift;
      markDemoPositions(session, price);
      checkDemoExits(session);
    }

    // Risk: daily loss halt
    if (await checkRiskHalts(session)) return;

    // Profit target from session start
    if (await checkProfitTarget(session)) return;

    // Cooldown after flat
    if (session.cooldownUntil && Date.now() < session.cooldownUntil) {
      return;
    }

    const candles = await fetchCandles(session, "1m", 60);
    const closes = candles.map((c) => c.close);
    if (closes.length) session.lastPrice = closes[closes.length - 1];

    const signal = computeSignal(closes);
    session.lastSignal = signal;

    const hasPositions = session.positions.length > 0;

    if (!hasPositions) {
      if (signal === "buy" || signal === "sell") {
        if (session.tradesToday >= session.settings.maxTradesPerDay) {
          addLog(session, "warn", "Max trades/day reached — skipping entry");
          return;
        }
        addLog(session, "signal", `EMA crossover signal → ${signal.toUpperCase()}`);
        await openMarketBasket(
          session,
          signal,
          session.settings.basketSize,
          session.settings.lotSize,
          session.settings.tpPoints,
          session.settings.slPoints
        );
      }
    } else {
      // Optional: flip if strong opposite signal (aggressive) — v0 keeps basket until TP/SL/target
      // Just log heartbeat
      const eq = session.account?.equity ?? 0;
      const start = session.sessionStartEquity || eq;
      const pnl = eq - start;
      if (Math.random() < 0.15) {
        addLog(
          session,
          "info",
          `Managing ${session.positions.length} pos | price=${session.lastPrice?.toFixed(2)} | session PnL=${pnl.toFixed(2)} | signal=${signal}`
        );
      }
    }

    // If just went flat and reentry enabled → set cooldown
    if (!session.positions.length && session.settings.reenterAfterFlat) {
      // only set if we recently traded — tradesToday > 0 and cooldown not set recently
      // Engine will wait cooldownSeconds before next entry naturally via cooldownUntil set on close
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog(session, "error", `Engine tick error: ${msg}`);
    session.lastError = msg;
  }
}

async function checkProfitTarget(session: InternalSession): Promise<boolean> {
  const eq = session.account?.equity ?? 0;
  const start = session.sessionStartEquity || eq;
  const pnl = eq - start;
  const { profitTargetUsd, profitTargetPct, stopOnProfitTarget, cooldownSeconds, reenterAfterFlat } =
    session.settings;

  let hit = false;
  if (profitTargetUsd > 0 && pnl >= profitTargetUsd) hit = true;
  if (profitTargetPct > 0 && start > 0 && (pnl / start) * 100 >= profitTargetPct) hit = true;

  if (!hit) return false;

  addLog(session, "trade", `Profit target hit — session PnL $${pnl.toFixed(2)}. Closing all.`);
  await closeAllPositions(session);
  session.cooldownUntil = Date.now() + cooldownSeconds * 1000;

  if (stopOnProfitTarget) {
    stopEngine(session.sessionId, "profit target reached");
  } else if (reenterAfterFlat) {
    addLog(session, "info", `Cooldown ${cooldownSeconds}s then may re-enter`);
  }
  return true;
}

async function checkRiskHalts(session: InternalSession): Promise<boolean> {
  const eq = session.account?.equity ?? 0;
  const start = session.sessionStartEquity || eq;
  const bal = session.account?.balance ?? start;
  const pnl = eq - start;
  const lossPct = start > 0 ? (-pnl / start) * 100 : 0;

  // Equity protect: if equity collapsed vs session start
  if (session.settings.maxDailyLossPct > 0 && lossPct >= session.settings.maxDailyLossPct) {
    addLog(
      session,
      "error",
      `Daily loss halt: ${lossPct.toFixed(1)}% >= ${session.settings.maxDailyLossPct}%. Closing & stopping.`
    );
    await closeAllPositions(session);
    session.status = "halted";
    stopEngine(session.sessionId, "daily loss halt");
    return true;
  }

  // Soft equity protect near wipe
  if (bal > 0 && eq < bal * 0.2 && session.positions.length > 0) {
    addLog(session, "error", "Equity protect — equity < 20% of balance. Closing & stopping.");
    await closeAllPositions(session);
    session.status = "halted";
    stopEngine(session.sessionId, "equity protect");
    return true;
  }

  return false;
}

/** After external close-all, arm cooldown. */
export function armCooldown(session: InternalSession) {
  session.cooldownUntil = Date.now() + session.settings.cooldownSeconds * 1000;
}
