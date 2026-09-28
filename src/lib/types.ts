export type BotStatus = "idle" | "connecting" | "connected" | "running" | "stopped" | "error" | "halted";

export interface BotSettings {
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

export interface PositionInfo {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: string;
}

export interface AccountSnapshot {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  login?: string;
  server?: string;
  broker?: string;
}

export interface LogEntry {
  id: string;
  ts: string;
  level: "info" | "warn" | "error" | "trade" | "signal";
  message: string;
}

export interface SessionState {
  sessionId: string;
  status: BotStatus;
  mode: "live" | "demo_sim";
  connected: boolean;
  account?: AccountSnapshot;
  symbol: string;
  positions: PositionInfo[];
  settings: BotSettings;
  logs: LogEntry[];
  sessionStartEquity: number;
  dailyPnl: number;
  tradesToday: number;
  lastSignal?: string;
  lastError?: string;
  botRunning: boolean;
  lastPrice?: number;
  cooldownUntil?: number;
}

export interface ConnectRequest {
  login: string;
  password: string;
  server: string;
  platform?: "mt5" | "mt4";
}

export const DEFAULT_SETTINGS: BotSettings = {
  lotSize: 0.01,
  basketSize: 4,
  tpPoints: 80,
  slPoints: 250,
  profitTargetUsd: 5,
  profitTargetPct: 0,
  maxDailyLossPct: 30,
  maxTradesPerDay: 40,
  cooldownSeconds: 15,
  symbol: "XAUUSD",
  reenterAfterFlat: true,
  stopOnProfitTarget: true,
};

export const EXNESS_SERVERS = [
  "Exness-MT5Real",
  "Exness-MT5Real2",
  "Exness-MT5Real3",
  "Exness-MT5Real4",
  "Exness-MT5Real5",
  "Exness-MT5Real6",
  "Exness-MT5Real7",
  "Exness-MT5Real8",
  "Exness-MT5Real9",
  "Exness-MT5Real10",
  "Exness-MT5Real11",
  "Exness-MT5Real12",
  "Exness-MT5Real13",
  "Exness-MT5Real14",
  "Exness-MT5Real15",
  "Exness-MT5Real16",
  "Exness-MT5Real17",
  "Exness-MT5Real18",
  "Exness-MT5Real19",
  "Exness-MT5Real20",
  "Exness-MT5Trial",
  "Exness-MT5Trial2",
  "Exness-MT5Trial3",
  "Exness-MT5Trial4",
  "Exness-MT5Trial5",
  "Exness-MT5Trial6",
  "Exness-MT5Trial7",
  "Exness-MT5Trial8",
  "Exness-MT5Trial9",
  "Exness-MT5Trial10",
  "Exness-MT5Trial11",
  "Exness-MT5Trial12",
] as const;
