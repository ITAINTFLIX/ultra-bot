# Ultra Bot

Cloud MT5 gold scalper web app. **Self-serve:** you open the app, paste **your own** Exness MT5 login / trading password / server, then Start Bot. Ultra Bot connects via [MetaApi](https://metaapi.cloud) and runs an aggressive multi-position XAUUSD basket strategy (Elite Bot–style demos on TikTok — **not** a profit guarantee).

We do **not** collect or store sample credentials in this repo. You supply yours at Connect time; they stay in process memory for the session only.

## Honest warning

- **No profit guarantees.** Demo videos ≠ live results.
- A **$10** high-leverage account can open `0.01` lot baskets, but **stop-out is easy** on gold.
- Basket size multiplies exposure (e.g. 4 × 0.01 ≈ 4× single-ticket risk to spread/slippage).
- Ultra Bot will **not** turn small deposits into large sums by design.
- Use only funds you can afford to lose. Not financial advice.

## How to use (self-serve)

```bash
cd /workspace/ultra-bot
cp .env.example .env.local
# optional for live MT5: paste token into METAAPI_TOKEN=
npm install
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000)
2. Go to **Connect**
3. Fill **your** Exness MT5 **Login**, **trading Password**, and **Server** (presets + custom)
4. Click **Connect**
5. On **Dashboard**: set lot / basket / TP / SL / profit target $ / daily loss %, then **Start Bot**
6. Watch live balance, positions, and logs. Trades are commented **"Ultra Bot"**

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## MetaApi token (operator / host)

The **host** of this app sets `METAAPI_TOKEN` so the MetaApi cloud bridge can attach to user-supplied MT5 logins. End users still enter their own MT5 credentials in the UI.

1. Sign up at [https://metaapi.cloud](https://metaapi.cloud)
2. Generate a token: [https://app.metaapi.cloud/token](https://app.metaapi.cloud/token)
3. Put it in `.env.local` (never commit):

```env
METAAPI_TOKEN=your_token_here
```

| Token | Behavior |
|-------|----------|
| Present | **LIVE** MetaApi path — real MT5 via cloud bridge |
| Missing / `ULTRA_FORCE_DEMO=1` | **DEMO_SIM** — fake $10 balance, synthetic M1 ticks, simulated baskets |

Live connect failures return an error (no silent demo fallback) so bad login/server are obvious.

## Exness server names

In MT5: **Navigator → right-click account →** note the server string exactly, e.g.:

- `Exness-MT5Real9`
- `Exness-MT5Trial`
- `Exness-MT5Real`, `Exness-MT5Real2`, …

The Connect page includes Exness Real / Trial presets plus a custom field for other brokers.

**Use the trading password**, not the investor (read-only) password.

## Strategy (v0)

- Symbol: `XAUUSD` / auto-detect gold variants (`XAUUSDm`, etc.)
- Signal: EMA(9) / EMA(21) crossover on M1 (trend-follow)
- Opens a **basket of N** identical market orders (default 4 × `0.01`)
- Tight TP / wider SL in points
- Optional: close all when equity − sessionStart ≥ profit target `$` (or `%`)
- Re-enter after flat + cooldown
- Daily loss % halt, max trades/day, soft equity protect
- Order comment: `Ultra Bot`

## $10 account / lot warnings

| Concern | Note |
|---------|------|
| Min lot | Many brokers allow `0.01`; some gold symbols use `0.01` min |
| Margin | High leverage helps open trades; it also accelerates wipeouts |
| Basket risk | 4 × 0.01 on gold ≈ 4× single-ticket exposure to spread/slippage |
| Defaults | Lot `0.01`, basket `4`, TP `80` pts, SL `250` pts — tune down if unstable |
| Guarantees | **None.** Small deposits are not a path to large profits |

## How MetaApi fits

```
Browser UI  →  Next.js API routes  →  metaapi.cloud-sdk
                                      (Provisioning account + RPC connection)
                                            ↓
                                      Your broker MT5 server
```

Ultra Bot never talks to Exness directly; MetaApi hosts a cloud terminal linked to the login **you** paste on Connect.

## Threat model (credentials)

| Item | Behavior |
|------|----------|
| Who enters them | **You** — self-serve Connect form; we do not collect them for you |
| Passwords | Kept **in process memory** for the active session only |
| Logs | Passwords are **fully redacted** (`[REDACTED]`); never partial or full values |
| Disk / repo | No password persistence; no sample credentials in the repo |
| Auth | **None yet** — local/single-user only |
| Multi-tenant | Do **not** expose publicly without auth + encryption-at-rest |

Restarting the Node process clears all sessions and credentials. `.env*.local` is gitignored.

## Project layout

```
src/app/           Landing, Connect, Dashboard + API routes
src/lib/metaapi.ts MetaApi bridge + DEMO_SIM
src/lib/ultra-engine.ts  Strategy loop
src/lib/session-store.ts In-memory session
src/components/    Nav, logs, disclaimer
```

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/connect` | POST | `{ login, password, server }` — user-supplied |
| `/api/status` | GET | Session snapshot |
| `/api/start` | POST | Start engine |
| `/api/stop` | POST | Stop engine |
| `/api/settings` | GET/POST | Bot knobs |
| `/api/logs` | GET | Recent logs |

## License

Private / experimental. Use at your own risk.
