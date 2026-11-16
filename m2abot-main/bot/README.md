# QuantPulse All-in-One Trading Bot Suite

This directory contains the complete **QuantPulse Python Robot** that pairs with the standalone web dashboard (`/index.html`). It unifies all three deployment modes into one codebase:

- **Option A — 24/7 Signal Scanner + Telegram Alerts**: Scans `BTC/USDT`, `ETH/USDT`, `SOL/USDT`, `XRP/USDT`, `EUR/USD`, `GBP/USD`, `USD/JPY`, and `XAU/USD` across `15m`, `1H`, and `4H` using the exact same Wilder RSI(14), EMA(20/50), MACD(12,26,9), and ATR(14) engine as `/index.html`.
- **Option B — Paper Trading (Default) + Live Binance Execution**: Paper-trades by default with a virtual `$10,000` balance, 50% scale-out at TP1 (1:2 R:R) + breakeven stop move, and TP2 (1:3 R:R), logging every trade to `bot/trades.csv`. Can be switched to Binance Spot Testnet (`MODE=testnet`) or Live Binance Spot (`MODE=live`) when ready.
- **Option C — Free Cloud Cron via GitHub Actions**: Uses `/.github/workflows/signal-scan.yml` to run `python bot/bot.py --once` every hour on GitHub's servers with zero hosting cost, while `/index.html` can be hosted free on GitHub Pages.

---

## 1. Quick Start (Local PC or VPS — 24/7 Mode)

```bash
cd bot
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `bot/.env` and add your Telegram credentials (optional, takes 2 minutes):
1. Open **@BotFather** on Telegram → send `/newbot` → copy the `TELEGRAM_BOT_TOKEN`.
2. Open **@userinfobot** on Telegram → copy your numeric `TELEGRAM_CHAT_ID`.
3. Send `/start` to your new bot in Telegram so it can message you.

Test Telegram delivery:
```bash
python bot/bot.py --test-telegram
```

Run a single scan or start the 24/7 scanner in **Paper Mode**:
```bash
python bot/bot.py --once     # Single scan across all pairs & timeframes
python bot/bot.py            # Continuous 24/7 scanner (scans every 60s)
python bot/bot.py --status   # View paper balance, win rate & open positions
```

---

## 2. Free Cloud Automation via GitHub Actions (Zero Server Cost)

1. Push this repository to GitHub (public repo gives free unlimited GitHub Actions minutes).
2. In your GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
3. Enable **Settings → Actions → General → Workflow permissions → Read and write permissions** so the workflow can save `bot/state.json` and `bot/trades.csv` between hourly runs.
4. Go to the **Actions** tab → select **QuantPulse 24/7 Signal & Paper-Trade Scanner** → click **Run workflow** to test immediately.
5. Enable **Settings → Pages → Deploy from a branch (`main` / root)** to host `/index.html` live for free!

---

## 3. Upgrading to Binance Auto-Execution (`MODE=testnet` / `MODE=live`)

1. Start on **Binance Spot Testnet** (`https://testnet.binance.vision`) and set `MODE=testnet` in `bot/.env`.
2. Verify order sizing (`RISK_PER_TRADE_PCT=1.0`, `MAX_OPEN_TRADES=3`) and OCO SL/TP placement for several weeks before ever considering `MODE=live`.
3. Never commit `bot/.env` or share your API secret. Restrict live Binance API keys to **Enable Spot & Margin Trading** only (never enable withdrawals) and whitelist your VPS IP address.
