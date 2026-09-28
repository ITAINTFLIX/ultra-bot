/**
 * MetaApi MT5 bridge.
 * Prefer metaapi.cloud-sdk when METAAPI_TOKEN is set.
 * Falls back to DEMO_SIM with synthetic gold ticks when token is missing
 * (or ULTRA_FORCE_DEMO=1).
 */

import { randomUUID } from "crypto";
import { addLog, InternalSession, updateSession } from "./session-store";
import { PositionInfo, AccountSnapshot } from "./types";
import { redactPassword } from "./redact";

const TRADE_COMMENT = "Ultra Bot";

export function hasMetaApiToken(): boolean {
  if (process.env.ULTRA_FORCE_DEMO === "1") return false;
  return Boolean(process.env.METAAPI_TOKEN?.trim());
}

const GOLD_CANDIDATES = ["XAUUSD", "XAUUSDm", "XAUUSDc", "GOLD", "XAUUSD.a", "XAUUSD."];

export async function connectAccount(
  session: InternalSession,
  login: string,
  password: string,
  server: string
): Promise<{ ok: boolean; error?: string }> {
  session.login = login;
  session.password = password;
  session.server = server;
  session.status = "connecting";
  addLog(
    session,
    "info",
    `Connecting login=${login} server=${server} password=${redactPassword(password)}`
  );

  if (!hasMetaApiToken()) {
    return connectDemoSim(session, login, server);
  }

  try {
    return await connectLive(session, login, password, server);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog(session, "error", `MetaApi connect failed: ${msg}`);
    session.status = "error";
    session.lastError = msg;
    session.connected = false;
    // Do NOT silently fall back to DEMO_SIM when a live token is configured —
    // user expects real MT5; surface the error so they can fix login/server.
    return { ok: false, error: msg };
  }
}

async function connectLive(
  session: InternalSession,
  login: string,
  password: string,
  server: string
): Promise<{ ok: boolean; error?: string }> {
  // Dynamic import so build works even if SDK has CJS quirks at edge
  const MetaApiMod = await import("metaapi.cloud-sdk");
  const MetaApi = (MetaApiMod as { default?: unknown }).default ?? MetaApiMod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = new (MetaApi as any)(process.env.METAAPI_TOKEN);

  addLog(session, "info", "Creating MetaApi provisioning account…");

  // Reuse existing account with same login+server if present
  let account = await api.metatraderAccountApi
    .getAccountsWithInfiniteScrollPagination()
    .then((accounts: Array<{ login: string; server: string; id: string; update?: (p: object) => Promise<unknown> }>) =>
      accounts.find((a) => String(a.login) === String(login) && a.server === server)
    )
    .catch(() => null);

  if (!account) {
    account = await api.metatraderAccountApi.createAccount({
      name: `UltraBot-${login}`,
      type: "cloud",
      login,
      password,
      server,
      platform: "mt5",
      magic: 20260928,
      quoteStreamingIntervalInSeconds: 0.5,
    });
  } else if (typeof account.update === "function") {
    // Refresh trading password in case user rotated it
    try {
      await account.update({ password });
      addLog(session, "info", "Updated MetaApi account trading password (in-memory only)");
    } catch {
      /* older SDK / no-op */
    }
  }

  session.accountId = account.id;
  addLog(session, "info", `MetaApi account id=${account.id} — deploying…`);

  await account.deploy();
  await account.waitConnected();

  const connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized();

  // Store connection on global for engine reuse
  const g = globalThis as unknown as { __ultraMetaConn?: Map<string, unknown> };
  if (!g.__ultraMetaConn) g.__ultraMetaConn = new Map();
  g.__ultraMetaConn.set(session.sessionId, { api, account, connection });

  const info = await connection.getAccountInformation();
  const symbol = await detectGoldSymbol(connection);

  const snapshot: AccountSnapshot = {
    balance: info.balance ?? 0,
    equity: info.equity ?? info.balance ?? 0,
    margin: info.margin ?? 0,
    freeMargin: info.freeMargin ?? info.balance ?? 0,
    leverage: info.leverage ?? 0,
    currency: info.currency ?? "USD",
    login,
    server,
    broker: info.broker ?? server,
  };

  updateSession(session.sessionId, {
    status: "connected",
    connected: true,
    mode: "live",
    account: snapshot,
    sessionStartEquity: snapshot.equity,
    symbol,
    lastError: undefined,
  });

  addLog(
    session,
    "info",
    `Connected LIVE. Balance=${snapshot.balance} Equity=${snapshot.equity} Symbol=${symbol}`
  );
  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function detectGoldSymbol(connection: any): Promise<string> {
  for (const sym of GOLD_CANDIDATES) {
    try {
      const spec = await connection.getSymbolSpecification(sym);
      if (spec) return sym;
    } catch {
      /* try next */
    }
  }
  return "XAUUSD";
}

function connectDemoSim(
  session: InternalSession,
  login: string,
  server: string
): { ok: boolean; error?: string } {
  const balance = 10;
  const snapshot: AccountSnapshot = {
    balance,
    equity: balance,
    margin: 0,
    freeMargin: balance,
    leverage: 2000,
    currency: "USD",
    login,
    server,
    broker: "DEMO_SIM",
  };

  updateSession(session.sessionId, {
    status: "connected",
    connected: true,
    mode: "demo_sim",
    account: snapshot,
    sessionStartEquity: balance,
    symbol: "XAUUSD",
    lastPrice: 2650.5,
    password: session.password,
    lastError: undefined,
  });

  addLog(
    session,
    "warn",
    "DEMO_SIM active — no METAAPI_TOKEN (or ULTRA_FORCE_DEMO=1). Fake ticks only; no real orders."
  );
  addLog(session, "info", `Sim account ready. Balance=$10 login=${login} server=${server}`);
  return { ok: true };
}

export function getMetaConnection(sessionId: string): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account: any;
} | null {
  const g = globalThis as unknown as {
    __ultraMetaConn?: Map<string, { connection: unknown; account: unknown }>;
  };
  const entry = g.__ultraMetaConn?.get(sessionId);
  if (!entry) return null;
  return entry as { connection: unknown; account: unknown };
}

export async function refreshAccount(session: InternalSession): Promise<void> {
  if (session.mode === "demo_sim") {
    // Equity from open sim positions
    const unrealized = session.positions.reduce((s, p) => s + p.profit, 0);
    if (session.account) {
      session.account.equity = session.account.balance + unrealized;
      session.account.margin = session.positions.length * session.settings.lotSize * 0.5;
      session.account.freeMargin = session.account.equity - session.account.margin;
    }
    return;
  }

  const meta = getMetaConnection(session.sessionId);
  if (!meta) return;
  try {
    const info = await meta.connection.getAccountInformation();
    const positions = await meta.connection.getPositions();
    session.account = {
      balance: info.balance ?? 0,
      equity: info.equity ?? 0,
      margin: info.margin ?? 0,
      freeMargin: info.freeMargin ?? 0,
      leverage: info.leverage ?? 0,
      currency: info.currency ?? "USD",
      login: session.login,
      server: session.server,
      broker: info.broker ?? session.server,
    };
    session.positions = (positions || []).map(
      (p: {
        id: string;
        symbol: string;
        type: string;
        volume: number;
        openPrice: number;
        currentPrice: number;
        profit: number;
        stopLoss?: number;
        takeProfit?: number;
        time?: string;
      }): PositionInfo => ({
        id: String(p.id),
        symbol: p.symbol,
        type: String(p.type).toLowerCase().includes("sell") ? "sell" : "buy",
        volume: p.volume,
        openPrice: p.openPrice,
        currentPrice: p.currentPrice,
        profit: p.profit,
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        openTime: p.time || new Date().toISOString(),
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog(session, "error", `refreshAccount: ${msg}`);
  }
}

export async function openMarketBasket(
  session: InternalSession,
  side: "buy" | "sell",
  count: number,
  lot: number,
  tpPoints: number,
  slPoints: number
): Promise<PositionInfo[]> {
  const symbol = session.symbol;
  const opened: PositionInfo[] = [];

  if (session.mode === "demo_sim") {
    const price = session.lastPrice ?? 2650;
    // Gold ~$0.01 per point per 0.01 lot approx for demo (simplified)
    const point = 0.01;
    for (let i = 0; i < count; i++) {
      const pos: PositionInfo = {
        id: `sim-${randomUUID().slice(0, 8)}`,
        symbol,
        type: side,
        volume: lot,
        openPrice: price,
        currentPrice: price,
        profit: 0,
        stopLoss: side === "buy" ? price - slPoints * point : price + slPoints * point,
        takeProfit: side === "buy" ? price + tpPoints * point : price - tpPoints * point,
        openTime: new Date().toISOString(),
      };
      opened.push(pos);
      session.positions.push(pos);
    }
    session.tradesToday += count;
    addLog(
      session,
      "trade",
      `DEMO opened basket ×${count} ${side.toUpperCase()} ${lot} lots @ ${price.toFixed(2)} (${TRADE_COMMENT})`
    );
    return opened;
  }

  const meta = getMetaConnection(session.sessionId);
  if (!meta) throw new Error("No MetaApi connection");

  const point = 0.01; // XAUUSD typical point; refine via symbol specification if needed
  let price = session.lastPrice ?? 0;
  try {
    const quote = await meta.connection.getSymbolPrice(symbol);
    price = side === "buy" ? quote.ask : quote.bid;
    session.lastPrice = price;
  } catch {
    /* use last */
  }

  for (let i = 0; i < count; i++) {
    const sl = side === "buy" ? price - slPoints * point : price + slPoints * point;
    const tp = side === "buy" ? price + tpPoints * point : price - tpPoints * point;
    const orderOpts = {
      comment: TRADE_COMMENT,
      clientId: `ub-${Date.now()}-${i}`,
    };
    const result =
      side === "buy"
        ? await meta.connection.createMarketBuyOrder(symbol, lot, sl, tp, orderOpts)
        : await meta.connection.createMarketSellOrder(symbol, lot, sl, tp, orderOpts);
    opened.push({
      id: String(result.positionId || result.orderId || randomUUID()),
      symbol,
      type: side,
      volume: lot,
      openPrice: price,
      currentPrice: price,
      profit: 0,
      stopLoss: sl,
      takeProfit: tp,
      openTime: new Date().toISOString(),
    });
  }
  session.tradesToday += count;
  addLog(
    session,
    "trade",
    `LIVE opened basket ×${count} ${side.toUpperCase()} ${lot} lots @ ${price} (${TRADE_COMMENT})`
  );
  await refreshAccount(session);
  return opened;
}

export async function closeAllPositions(session: InternalSession): Promise<number> {
  const n = session.positions.length;
  if (session.mode === "demo_sim") {
    const pnl = session.positions.reduce((s, p) => s + p.profit, 0);
    if (session.account) {
      session.account.balance += pnl;
      session.account.equity = session.account.balance;
    }
    session.positions = [];
    addLog(session, "trade", `DEMO closed all (${n}) — realized PnL ${pnl.toFixed(2)}`);
    return n;
  }

  const meta = getMetaConnection(session.sessionId);
  if (!meta) return 0;
  try {
    await meta.connection.closePositionsBySymbol(session.symbol);
  } catch {
    // fallback: close one by one
    for (const p of [...session.positions]) {
      try {
        await meta.connection.closePosition(p.id);
      } catch (err) {
        addLog(session, "error", `close ${p.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  addLog(session, "trade", `LIVE closed all positions on ${session.symbol}`);
  await refreshAccount(session);
  return n;
}

export async function fetchCandles(
  session: InternalSession,
  timeframe = "1m",
  limit = 60
): Promise<Array<{ time: number; close: number }>> {
  if (session.mode === "demo_sim") {
    return generateSimCandles(session, limit);
  }
  const meta = getMetaConnection(session.sessionId);
  if (!meta) return generateSimCandles(session, limit);
  try {
    const candles = await meta.connection.getCandles(session.symbol, timeframe, undefined, limit);
    return (candles || []).map((c: { time: string | Date; close: number }) => ({
      time: new Date(c.time).getTime(),
      close: c.close,
    }));
  } catch {
    return generateSimCandles(session, limit);
  }
}

function generateSimCandles(
  session: InternalSession,
  limit: number
): Array<{ time: number; close: number }> {
  const base = session.lastPrice ?? 2650;
  const out: Array<{ time: number; close: number }> = [];
  let price = base - 2;
  const now = Date.now();
  for (let i = limit; i > 0; i--) {
    // mild trending noise
    price += (Math.random() - 0.48) * 0.35;
    out.push({ time: now - i * 60_000, close: price });
  }
  session.lastPrice = out[out.length - 1]?.close ?? base;
  return out;
}

/** Mark-to-market demo positions with current price. */
export function markDemoPositions(session: InternalSession, price: number) {
  session.lastPrice = price;
  const pipValuePerLot = 1; // simplified: $1 per 0.01 move per 0.01 lot ≈ rough demo
  for (const p of session.positions) {
    p.currentPrice = price;
    const diff = p.type === "buy" ? price - p.openPrice : p.openPrice - price;
    // profit ≈ diff / 0.01 * lot * ~$0.01-scaled for tiny accounts
    p.profit = diff * (p.volume / 0.01) * pipValuePerLot;
  }
  if (session.account) {
    const unrealized = session.positions.reduce((s, p) => s + p.profit, 0);
    session.account.equity = session.account.balance + unrealized;
  }
}

/** Auto-close demo positions that hit TP/SL. */
export function checkDemoExits(session: InternalSession): number {
  const keep: PositionInfo[] = [];
  let closed = 0;
  for (const p of session.positions) {
    const hitTp =
      p.takeProfit != null &&
      ((p.type === "buy" && p.currentPrice >= p.takeProfit) ||
        (p.type === "sell" && p.currentPrice <= p.takeProfit));
    const hitSl =
      p.stopLoss != null &&
      ((p.type === "buy" && p.currentPrice <= p.stopLoss) ||
        (p.type === "sell" && p.currentPrice >= p.stopLoss));
    if (hitTp || hitSl) {
      if (session.account) session.account.balance += p.profit;
      addLog(
        session,
        "trade",
        `DEMO ${hitTp ? "TP" : "SL"} hit ${p.id} PnL=${p.profit.toFixed(2)}`
      );
      closed++;
    } else {
      keep.push(p);
    }
  }
  session.positions = keep;
  if (session.account) {
    const unrealized = keep.reduce((s, p) => s + p.profit, 0);
    session.account.equity = session.account.balance + unrealized;
  }
  return closed;
}
