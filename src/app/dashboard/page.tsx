"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { LogPanel, LogLine } from "@/components/LogPanel";

interface Settings {
  lotSize: number;
  basketSize: number;
  tpPoints: number;
  slPoints: number;
  profitTargetUsd: number;
  profitTargetPct: number;
  maxDailyLossPct: number;
  maxTradesPerDay: number;
  cooldownSeconds: number;
  symbol: string;
  reenterAfterFlat: boolean;
  stopOnProfitTarget: boolean;
}

interface Position {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  takeProfit?: number;
  stopLoss?: number;
}

interface Session {
  sessionId: string;
  status: string;
  mode: string;
  connected: boolean;
  account?: {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    leverage: number;
    currency: string;
    login?: string;
    server?: string;
  };
  symbol: string;
  positions: Position[];
  settings: Settings;
  logs: LogLine[];
  sessionStartEquity: number;
  tradesToday: number;
  lastSignal?: string;
  lastError?: string;
  botRunning: boolean;
  lastPrice?: number;
  login?: string;
  server?: string;
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState<"start" | "stop" | "save" | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setSettings(data.session.settings);
      }
    } catch {
      /* ignore poll errors */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 1500);
    return () => clearInterval(id);
  }, [refresh]);

  async function startBot() {
    if (!session) return;
    setBusy("start");
    setMsg(null);
    try {
      const res = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = await res.json();
      if (!data.ok) setMsg(data.error || "Start failed");
      else if (data.session) setSession(data.session);
    } finally {
      setBusy(null);
      void refresh();
    }
  }

  async function stopBot() {
    if (!session) return;
    setBusy("stop");
    try {
      const res = await fetch("/api/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = await res.json();
      if (data.session) setSession(data.session);
    } finally {
      setBusy(null);
      void refresh();
    }
  }

  async function saveSettings() {
    if (!session || !settings) return;
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, settings }),
      });
      const data = await res.json();
      if (!data.ok) setMsg(data.error || "Save failed");
      else {
        setMsg("Settings saved");
        if (data.session) setSession(data.session);
      }
    } finally {
      setBusy(null);
    }
  }

  if (!session) {
    return (
      <div className="panel p-8 text-center text-slate-400">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        Loading session…
      </div>
    );
  }

  if (!session.connected) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="panel p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-lg font-bold text-emerald-400">
            UB
          </div>
          <h1 className="text-xl font-bold">Not connected</h1>
          <p className="mt-2 text-sm text-slate-400">
            Connect your own MT5 account on the Connect page, then come back to Start Bot.
          </p>
          <Link href="/connect" className="btn-primary mt-6 inline-flex px-8">
            Go to Connect
          </Link>
        </div>
        <Disclaimer compact />
      </div>
    );
  }

  const acct = session.account;
  const sessionPnl = (acct?.equity ?? 0) - (session.sessionStartEquity || 0);
  const statusColor =
    session.status === "running"
      ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
      : session.status === "halted" || session.status === "error"
        ? "bg-red-500"
        : "bg-slate-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`} />
            <span className="capitalize font-medium text-slate-200">{session.status}</span>
            <span className="text-slate-600">·</span>
            <span
              className={
                session.mode === "live"
                  ? "rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-400"
                  : "rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-400"
              }
            >
              {session.mode === "live" ? "LIVE MetaApi" : "DEMO_SIM"}
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-xs">
              {session.login || acct?.login} @ {session.server || acct?.server}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {!session.botRunning ? (
            <button
              className="btn-primary px-8 py-3 shadow-lg shadow-emerald-500/20"
              onClick={() => void startBot()}
              disabled={busy === "start"}
            >
              {busy === "start" ? "Starting…" : "▶ Start Bot"}
            </button>
          ) : (
            <button
              className="btn-danger px-8 py-3"
              onClick={() => void stopBot()}
              disabled={busy === "stop"}
            >
              {busy === "stop" ? "Stopping…" : "■ Stop Bot"}
            </button>
          )}
        </div>
      </div>

      {(acct?.balance ?? 0) <= 50 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <strong className="text-amber-400">$10 / small-account warning:</strong> High leverage can
          open 0.01 lot baskets, but stop-out on gold is easy. No profit guarantees. Tune lot &amp;
          basket down if unstable.
        </div>
      )}

      {msg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {msg}
        </div>
      )}
      {session.lastError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {session.lastError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Balance" value={`$${(acct?.balance ?? 0).toFixed(2)}`} />
        <Stat
          label="Equity"
          value={`$${(acct?.equity ?? 0).toFixed(2)}`}
          accent={sessionPnl >= 0 ? "green" : "red"}
        />
        <Stat
          label="Session PnL"
          value={`${sessionPnl >= 0 ? "+" : ""}$${sessionPnl.toFixed(2)}`}
          accent={sessionPnl >= 0 ? "green" : "red"}
        />
        <Stat
          label="Price / Signal"
          value={`${session.lastPrice?.toFixed(2) ?? "—"} / ${session.lastSignal ?? "—"}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Strategy knobs</h2>
            <button
              className="btn-ghost py-1.5 text-xs"
              onClick={() => void saveSettings()}
              disabled={busy === "save" || !settings}
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          </div>
          {settings && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Lot size"
                value={settings.lotSize}
                step={0.01}
                onChange={(v) => setSettings({ ...settings, lotSize: v })}
              />
              <Field
                label="Basket size"
                value={settings.basketSize}
                step={1}
                onChange={(v) => setSettings({ ...settings, basketSize: v })}
              />
              <Field
                label="TP points"
                value={settings.tpPoints}
                step={1}
                onChange={(v) => setSettings({ ...settings, tpPoints: v })}
              />
              <Field
                label="SL points"
                value={settings.slPoints}
                step={1}
                onChange={(v) => setSettings({ ...settings, slPoints: v })}
              />
              <Field
                label="Profit target $"
                value={settings.profitTargetUsd}
                step={0.5}
                onChange={(v) => setSettings({ ...settings, profitTargetUsd: v })}
              />
              <Field
                label="Daily loss %"
                value={settings.maxDailyLossPct}
                step={1}
                onChange={(v) => setSettings({ ...settings, maxDailyLossPct: v })}
              />
              <Field
                label="Max trades/day"
                value={settings.maxTradesPerDay}
                step={1}
                onChange={(v) => setSettings({ ...settings, maxTradesPerDay: v })}
              />
              <Field
                label="Cooldown sec"
                value={settings.cooldownSeconds}
                step={1}
                onChange={(v) => setSettings({ ...settings, cooldownSeconds: v })}
              />
              <div className="col-span-2">
                <label className="label">Symbol</label>
                <input
                  className="input"
                  value={settings.symbol}
                  onChange={(e) => setSettings({ ...settings, symbol: e.target.value })}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                  checked={settings.stopOnProfitTarget}
                  onChange={(e) =>
                    setSettings({ ...settings, stopOnProfitTarget: e.target.checked })
                  }
                />
                Stop bot when profit target hit
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                  checked={settings.reenterAfterFlat}
                  onChange={(e) =>
                    setSettings({ ...settings, reenterAfterFlat: e.target.checked })
                  }
                />
                Re-enter after flat + cooldown
              </label>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Trades today: {session.tradesToday} · Open: {session.positions.length} · Symbol:{" "}
            {session.symbol} · Comment: &quot;Ultra Bot&quot;
          </p>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <h2 className="text-sm font-semibold">Open positions</h2>
            <span className="text-xs text-slate-500">{session.positions.length}</span>
          </div>
          <div className="max-h-80 overflow-auto">
            {session.positions.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No open positions</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[var(--panel)] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Vol</th>
                    <th className="px-3 py-2">Open</th>
                    <th className="px-3 py-2">Now</th>
                    <th className="px-3 py-2">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {session.positions.map((p) => (
                    <tr key={p.id} className="border-t border-[var(--border)]">
                      <td
                        className={`px-3 py-2 font-semibold uppercase ${
                          p.type === "buy" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {p.type}
                      </td>
                      <td className="px-3 py-2">{p.volume}</td>
                      <td className="px-3 py-2 font-mono">{p.openPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono">{p.currentPrice.toFixed(2)}</td>
                      <td
                        className={`px-3 py-2 font-mono ${
                          p.profit >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {p.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <LogPanel logs={session.logs} />
      <Disclaimer compact />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent === "green"
            ? "text-emerald-400"
            : accent === "red"
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
