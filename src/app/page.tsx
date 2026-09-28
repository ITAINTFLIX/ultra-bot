import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

export default function LandingPage() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden pt-6 text-center md:pt-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),transparent_55%)]" />
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Cloud MT5 · Gold scalper · Self-serve connect
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-white md:text-7xl">
          Ultra <span className="text-emerald-400">Bot</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400 md:text-xl">
          Connect <em className="not-italic text-slate-200">your</em> Exness MT5 account. Ultra Bot
          bridges via MetaApi and runs an aggressive multi-position XAUUSD basket scalper — Start /
          Stop, lot & basket knobs, TP/SL, profit targets, and live logs.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/connect" className="btn-primary px-10 py-3.5 text-base shadow-lg shadow-emerald-500/25">
            Connect your MT5
          </Link>
          <Link href="/dashboard" className="btn-ghost py-3.5">
            Open dashboard
          </Link>
        </div>
        <p className="mt-5 text-xs text-slate-500">
          You paste your own login · We never collect credentials for you · Without{" "}
          <code className="text-slate-400">METAAPI_TOKEN</code> the app runs{" "}
          <span className="text-amber-400">DEMO_SIM</span> for UI testing.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Self-serve connect",
            body: "Login, trading password, Exness server presets (or custom). Password never logged. Memory-only for the session.",
          },
          {
            title: "Basket gold scalps",
            body: "Opens N identical market orders on XAUUSD / XAUUSDm with micro lots. Trades comment as “Ultra Bot”.",
          },
          {
            title: "Risk knobs live",
            body: "Lot, basket size, TP/SL points, profit target $, daily loss %, max trades/day, cooldown re-entry.",
          },
        ].map((c) => (
          <div key={c.title} className="panel group p-5 transition hover:border-emerald-500/30">
            <h3 className="font-semibold text-emerald-400">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="panel relative overflow-hidden p-6 md:p-8">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <h2 className="text-lg font-semibold">How to run (self-serve)</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-400">
          <li>
            Open the app → <span className="text-slate-200">Connect</span>
          </li>
          <li>Fill your Exness MT5 login, trading password, and server</li>
          <li>
            Hit <span className="text-emerald-400">Connect</span>, then{" "}
            <span className="text-emerald-400">Start Bot</span> on the dashboard
          </li>
          <li>Tune lot / basket / TP / SL / profit target / daily loss % live</li>
        </ol>
      </section>

      <Disclaimer />

      <section className="panel border-red-500/20 p-6">
        <h2 className="text-lg font-semibold text-red-300">$10 lot & profit warnings</h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-400">
          <li>
            A <strong className="text-slate-200">$10</strong> high-leverage account can open{" "}
            <code className="text-slate-300">0.01</code> lot baskets — that does{" "}
            <em className="not-italic text-amber-400">not</em> mean sustainable profits.
          </li>
          <li>Stop-out on gold scalp baskets is common; spreads and slippage matter.</li>
          <li>TikTok / Elite Bot–style demos are marketing, not a promise.</li>
          <li>
            <strong className="text-slate-200">No profit guarantees.</strong> Ultra Bot will not
            turn small deposits into large sums by design.
          </li>
        </ul>
      </section>
    </div>
  );
}
