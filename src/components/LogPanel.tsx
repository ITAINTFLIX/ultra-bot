"use client";

import { useEffect, useRef } from "react";

export interface LogLine {
  id: string;
  ts: string;
  level: string;
  message: string;
}

const levelColor: Record<string, string> = {
  info: "text-slate-300",
  warn: "text-amber-400",
  error: "text-red-400",
  trade: "text-emerald-400",
  signal: "text-sky-400",
};

export function LogPanel({ logs }: { logs: LogLine[] }) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="panel flex h-80 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <h3 className="text-sm font-semibold text-slate-200">Live log</h3>
        <span className="text-xs text-slate-500">{logs.length} entries</span>
      </div>
      <div className="log-scroll flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 && (
          <p className="text-slate-500">Waiting for activity…</p>
        )}
        {logs.map((l) => (
          <div key={l.id} className="mb-1 flex gap-2">
            <span className="shrink-0 text-slate-600">
              {new Date(l.ts).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 uppercase ${levelColor[l.level] || "text-slate-400"}`}>
              [{l.level}]
            </span>
            <span className="text-slate-300">{l.message}</span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
    </div>
  );
}
