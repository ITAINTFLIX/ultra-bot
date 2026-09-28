"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { EXNESS_SERVERS } from "@/lib/types";

export default function ConnectPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("Exness-MT5Real9");
  const [customServer, setCustomServer] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedServer = useMemo(
    () => (useCustom ? customServer.trim() : server),
    [useCustom, customServer, server]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!login || !password || !resolvedServer) {
      setError("Login, password, and server are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, server: resolvedServer }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Connection failed");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center sm:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Self-serve · Your credentials stay on your session
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Connect MT5</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter <strong className="text-slate-200">your own</strong> Exness (or any broker) MT5
          login. Ultra Bot never asks us to collect credentials for you — you connect yourself.
          Use the <strong className="text-slate-200">trading password</strong>, not the investor
          (read-only) password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="panel space-y-5 p-6 sm:p-8">
        <div>
          <label className="label" htmlFor="login">
            Login
          </label>
          <input
            id="login"
            className="input text-base"
            autoComplete="username"
            inputMode="numeric"
            placeholder="Your MT5 account number"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input text-base"
            autoComplete="current-password"
            placeholder="Trading password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Password is never written to logs or disk — memory only for this browser session&apos;s
            server process.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="server">
            Server
          </label>
          {!useCustom ? (
            <select
              id="server"
              className="input text-base"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            >
              <optgroup label="Exness Real">
                {EXNESS_SERVERS.filter((s) => s.includes("Real")).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Exness Trial / Demo">
                {EXNESS_SERVERS.filter((s) => s.includes("Trial")).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            </select>
          ) : (
            <input
              id="server"
              className="input text-base"
              placeholder="Exact server name from MT5 Navigator"
              value={customServer}
              onChange={(e) => setCustomServer(e.target.value)}
              required
            />
          )}
          <button
            type="button"
            className="mt-2 text-xs font-medium text-emerald-400 hover:underline"
            onClick={() => setUseCustom((v) => !v)}
          >
            {useCustom ? "← Use Exness presets" : "Other broker — enter custom server →"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full py-3.5 text-base shadow-lg shadow-emerald-500/20"
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Connecting…
            </span>
          ) : (
            "Connect"
          )}
        </button>
      </form>

      <div className="panel space-y-2 p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Where to find server name</p>
        <p>
          MT5 → <span className="text-slate-300">Navigator</span> → right-click your account → copy
          the server string exactly (e.g.{" "}
          <code className="rounded bg-black/40 px-1 text-emerald-400">Exness-MT5Real9</code> or{" "}
          <code className="rounded bg-black/40 px-1 text-emerald-400">Exness-MT5Trial</code>).
        </p>
      </div>

      <Disclaimer />
    </div>
  );
}
