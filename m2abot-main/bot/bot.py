#!/usr/bin/env python3
"""
QuantPulse All-in-One Forex & Crypto Signal & Trading Bot
=========================================================
Combines:
  - Option A: 24/7 Technical Analysis Scanner (RSI 14, EMA 20/50, MACD 12/26/9, ATR 14) + Telegram Alerts
  - Option B: Paper Trading Simulator (default) + Live/Testnet Binance Spot Auto-Execution
  - Option C: Single-run (--once) mode for zero-cost GitHub Actions cloud cron scheduling

Usage:
  python bot/bot.py                 # Run 24/7 continuous loop (paper mode by default)
  python bot/bot.py --once          # Run a single scan across all pairs/timeframes and exit
  python bot/bot.py --status        # Print paper portfolio balance, open positions, and stats
  python bot/bot.py --test-telegram # Send a test message to verify Telegram configuration
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN
import hashlib
import hmac
import json
import logging
import math
import os
from pathlib import Path
import signal
import sys
import time
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

try:
    import requests
except ImportError:
    requests = None

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
        return False


# =============================================================================
# PATHS & LOGGING
# =============================================================================
BOT_DIR = Path(__file__).resolve().parent
ROOT_DIR = BOT_DIR.parent

# Load bot/.env first, then root .env if present
load_dotenv(BOT_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

STATE_PATH = BOT_DIR / "state.json"
TRADES_CSV_PATH = BOT_DIR / "trades.csv"
SIGNALS_JSON_PATH = BOT_DIR / "latest_signals.json"
LOG_PATH = BOT_DIR / "bot.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
    ],
)
logger = logging.getLogger("quantpulse")


# =============================================================================
# ASSET & TIMEFRAME CATALOG
# =============================================================================
ASSET_CATALOG: dict[str, dict[str, Any]] = {
    # Crypto
    "BTCUSDT": {"market": "crypto", "label": "BTC/USDT", "decimals": 2, "okx": "BTC-USDT"},
    "ETHUSDT": {"market": "crypto", "label": "ETH/USDT", "decimals": 2, "okx": "ETH-USDT"},
    "SOLUSDT": {"market": "crypto", "label": "SOL/USDT", "decimals": 2, "okx": "SOL-USDT"},
    "XRPUSDT": {"market": "crypto", "label": "XRP/USDT", "decimals": 4, "okx": "XRP-USDT"},
    # Forex & Gold
    "EURUSD": {"market": "forex", "label": "EUR/USD", "decimals": 5, "yahoo": "EURUSD=X", "kraken": "EURUSD", "base": "EUR", "quote": "USD"},
    "GBPUSD": {"market": "forex", "label": "GBP/USD", "decimals": 5, "yahoo": "GBPUSD=X", "kraken": "GBPUSD", "base": "GBP", "quote": "USD"},
    "USDJPY": {"market": "forex", "label": "USD/JPY", "decimals": 3, "yahoo": "USDJPY=X", "base": "USD", "quote": "JPY"},
    "XAUUSD": {"market": "forex", "label": "XAU/USD", "decimals": 2, "yahoo": "GC=F", "yahoo_alt": "XAUUSD=X", "binance_gold": "PAXGUSDT"},
}

TIMEFRAME_MAP: dict[str, dict[str, Any]] = {
    "15m": {"binance": "15m", "bybit": "15", "okx": "15m", "kraken": 15, "yahoo_interval": "15m", "yahoo_range": "5d", "agg_4h": False},
    "1H":  {"binance": "1h",  "bybit": "60", "okx": "1H",  "kraken": 60, "yahoo_interval": "1h",  "yahoo_range": "1mo", "agg_4h": False},
    "4H":  {"binance": "4h",  "bybit": "240", "okx": "4H", "kraken": 240, "yahoo_interval": "1h", "yahoo_range": "3mo", "agg_4h": True},
    "1D":  {"binance": "1d",  "bybit": "D",  "okx": "1D",  "kraken": 1440, "yahoo_interval": "1d", "yahoo_range": "1y",  "agg_4h": False},
}


@dataclass
class Config:
    mode: str
    telegram_token: str
    telegram_chat_id: str
    binance_api_key: str
    binance_api_secret: str
    crypto_pairs: list[str]
    forex_pairs: list[str]
    timeframes: list[str]
    min_signal_score: int
    paper_balance_usdt: float
    risk_per_trade_pct: float
    max_open_trades: int
    scan_interval_seconds: int

    @classmethod
    def from_env(cls) -> "Config":
        mode = os.getenv("MODE", "paper").strip().lower()
        if mode not in {"paper", "testnet", "live"}:
            logger.warning("Unknown MODE=%r; defaulting to 'paper'.", mode)
            mode = "paper"

        def parse_csv(env_name: str, default: str) -> list[str]:
            raw = os.getenv(env_name, default)
            return [x.strip() for x in raw.split(",") if x.strip()]

        return cls(
            mode=mode,
            telegram_token=os.getenv("TELEGRAM_BOT_TOKEN", "").strip(),
            telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID", "").strip(),
            binance_api_key=os.getenv("BINANCE_API_KEY", "").strip(),
            binance_api_secret=os.getenv("BINANCE_API_SECRET", "").strip(),
            crypto_pairs=[p.upper() for p in parse_csv("CRYPTO_PAIRS", "BTCUSDT,ETHUSDT,SOLUSDT,XRPUSDT")],
            forex_pairs=[p.upper() for p in parse_csv("FOREX_PAIRS", "EURUSD,GBPUSD,USDJPY,XAUUSD")],
            timeframes=[tf for tf in parse_csv("TIMEFRAMES", "15m,1H,4H") if tf in TIMEFRAME_MAP],
            min_signal_score=int(os.getenv("MIN_SIGNAL_SCORE", "2")),
            paper_balance_usdt=float(os.getenv("PAPER_BALANCE_USDT", "10000")),
            risk_per_trade_pct=float(os.getenv("RISK_PER_TRADE_PCT", "1.0")),
            max_open_trades=int(os.getenv("MAX_OPEN_TRADES", "3")),
            scan_interval_seconds=max(15, int(os.getenv("SCAN_INTERVAL_SECONDS", "60"))),
        )


# =============================================================================
# HTTP & CANDLE NORMALIZATION HELPERS
# =============================================================================
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) QuantPulseBot/1.0"
}
_SESSION = requests.Session() if requests else None
if _SESSION:
    _SESSION.headers.update(DEFAULT_HEADERS)


class _SimpleResponse:
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text
        self.ok = 200 <= status_code < 300

    def raise_for_status(self) -> None:
        if not self.ok:
            raise RuntimeError(f"HTTP {self.status_code}: {self.text[:200]}")

    def json(self) -> Any:
        return json.loads(self.text)


def http_request(
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    data: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 10,
) -> _SimpleResponse:
    if _SESSION:
        r = _SESSION.request(
            method,
            url,
            params=params,
            data=data,
            json=json_body,
            headers=headers,
            timeout=timeout,
        )
        return _SimpleResponse(r.status_code, r.text)

    full_url = url
    if params:
        sep = "&" if "?" in url else "?"
        full_url = f"{url}{sep}{urlencode(params)}"

    req_headers = dict(DEFAULT_HEADERS)
    if headers:
        req_headers.update(headers)

    body_bytes: bytes | None = None
    if json_body is not None:
        body_bytes = json.dumps(json_body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
    elif data is not None:
        body_bytes = urlencode(data).encode("utf-8")
        req_headers["Content-Type"] = "application/x-www-form-urlencoded"

    req = Request(full_url, data=body_bytes, headers=req_headers, method=method.upper())
    try:
        with urlopen(req, timeout=timeout) as resp:
            return _SimpleResponse(resp.status, resp.read().decode("utf-8", errors="replace"))
    except HTTPError as err:
        err_body = err.read().decode("utf-8", errors="replace") if err.fp else str(err)
        return _SimpleResponse(err.code, err_body)


def normalize_candles(raw_candles: list[dict[str, float]]) -> list[dict[str, float]]:
    by_time: dict[int, dict[str, float]] = {}
    for c in raw_candles:
        t = c.get("time")
        o = c.get("open")
        h = c.get("high")
        l = c.get("low")
        cl = c.get("close")
        if None in (t, o, h, l, cl):
            continue
        if not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0 for v in (t, o, h, l, cl)):
            continue
        ti = int(t)
        by_time[ti] = {
            "time": ti,
            "open": float(o),
            "high": float(max(h, o, cl)),
            "low": float(min(l, o, cl)),
            "close": float(cl),
        }
    return [by_time[k] for k in sorted(by_time.keys())]


def aggregate_to_4h(hourly: list[dict[str, float]]) -> list[dict[str, float]]:
    buckets: dict[int, dict[str, float]] = {}
    step = 4 * 3600
    for c in hourly:
        bt = (int(c["time"]) // step) * step
        if bt not in buckets:
            buckets[bt] = {
                "time": bt,
                "open": c["open"],
                "high": c["high"],
                "low": c["low"],
                "close": c["close"],
            }
        else:
            buckets[bt]["high"] = max(buckets[bt]["high"], c["high"])
            buckets[bt]["low"] = min(buckets[bt]["low"], c["low"])
            buckets[bt]["close"] = c["close"]
    return normalize_candles(list(buckets.values()))


def fetch_crypto_candles(symbol: str, tf: str) -> tuple[list[dict[str, float]], str]:
    tf_cfg = TIMEFRAME_MAP[tf]
    asset = ASSET_CATALOG.get(symbol, {"okx": f"{symbol[:-4]}-{symbol[-4:]}"})
    errors: list[str] = []

    # 1. Binance Vision Data API
    try:
        r = http_request(
            "GET",
            "https://data-api.binance.vision/api/v3/klines",
            params={"symbol": symbol, "interval": tf_cfg["binance"], "limit": 160},
            timeout=8,
        )
        r.raise_for_status()
        raw = r.json()
        if isinstance(raw, list) and len(raw) >= 60:
            candles = normalize_candles([
                {"time": k[0] / 1000.0, "open": float(k[1]), "high": float(k[2]), "low": float(k[3]), "close": float(k[4])}
                for k in raw
            ])
            if len(candles) >= 60:
                return candles, "Binance Vision API"
    except Exception as exc:
        errors.append(f"BinanceVision={exc}")

    # 2. Binance Spot API
    try:
        r = http_request(
            "GET",
            "https://api.binance.com/api/v3/klines",
            params={"symbol": symbol, "interval": tf_cfg["binance"], "limit": 160},
            timeout=8,
        )
        r.raise_for_status()
        raw = r.json()
        if isinstance(raw, list) and len(raw) >= 60:
            candles = normalize_candles([
                {"time": k[0] / 1000.0, "open": float(k[1]), "high": float(k[2]), "low": float(k[3]), "close": float(k[4])}
                for k in raw
            ])
            if len(candles) >= 60:
                return candles, "Binance Public API"
    except Exception as exc:
        errors.append(f"Binance={exc}")

    # 3. Bybit V5 Public API
    try:
        r = http_request(
            "GET",
            "https://api.bybit.com/v5/market/kline",
            params={"category": "spot", "symbol": symbol, "interval": tf_cfg["bybit"], "limit": 160},
            timeout=8,
        )
        r.raise_for_status()
        rows = r.json().get("result", {}).get("list", [])
        if len(rows) >= 60:
            candles = normalize_candles([
                {"time": int(k[0]) / 1000.0, "open": float(k[1]), "high": float(k[2]), "low": float(k[3]), "close": float(k[4])}
                for k in rows
            ])
            if len(candles) >= 60:
                return candles, "Bybit Public API"
    except Exception as exc:
        errors.append(f"Bybit={exc}")

    # 4. OKX Public API
    try:
        r = http_request(
            "GET",
            "https://www.okx.com/api/v5/market/candles",
            params={"instId": asset.get("okx"), "bar": tf_cfg["okx"], "limit": 160},
            timeout=8,
        )
        r.raise_for_status()
        rows = r.json().get("data", [])
        if len(rows) >= 60:
            candles = normalize_candles([
                {"time": int(k[0]) / 1000.0, "open": float(k[1]), "high": float(k[2]), "low": float(k[3]), "close": float(k[4])}
                for k in rows
            ])
            if len(candles) >= 60:
                return candles, "OKX Public API"
    except Exception as exc:
        errors.append(f"OKX={exc}")

    raise RuntimeError(f"Crypto feed failed for {symbol} ({'; '.join(errors)})")


def fetch_yahoo_candles(yahoo_sym: str, tf_cfg: dict[str, Any]) -> list[dict[str, float]] | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_sym}"
    r = http_request(
        "GET",
        url,
        params={"interval": tf_cfg["yahoo_interval"], "range": tf_cfg["yahoo_range"], "includePrePost": "false"},
        timeout=10,
    )
    r.raise_for_status()
    result = r.json().get("chart", {}).get("result", [None])[0]
    if not result:
        return None
    timestamps = result.get("timestamp", [])
    quote = result.get("indicators", {}).get("quote", [{}])[0]
    opens = quote.get("open", [])
    highs = quote.get("high", [])
    lows = quote.get("low", [])
    closes = quote.get("close", [])

    raw = []
    for i, ts in enumerate(timestamps):
        o, h, l, c = opens[i], highs[i], lows[i], closes[i]
        if None not in (o, h, l, c):
            raw.append({"time": ts, "open": o, "high": h, "low": l, "close": c})

    candles = normalize_candles(raw)
    if tf_cfg["agg_4h"]:
        candles = aggregate_to_4h(candles)
    return candles if len(candles) >= 60 else None


def fetch_forex_candles(symbol: str, tf: str) -> tuple[list[dict[str, float]], str]:
    tf_cfg = TIMEFRAME_MAP[tf]
    asset = ASSET_CATALOG[symbol]
    errors: list[str] = []

    # 1. Direct Yahoo Finance (no CORS proxy needed in Python)
    for y_key in ("yahoo", "yahoo_alt"):
        y_sym = asset.get(y_key)
        if not y_sym:
            continue
        try:
            candles = fetch_yahoo_candles(y_sym, tf_cfg)
            if candles:
                return candles, "Yahoo Finance FX"
        except Exception as exc:
            errors.append(f"Yahoo({y_sym})={exc}")

    # 2. PAXGUSDT fallback for Gold (XAU/USD)
    if asset.get("binance_gold"):
        try:
            candles, _ = fetch_crypto_candles(asset["binance_gold"], tf)
            return candles, "PAXG Gold (Binance Vision)"
        except Exception as exc:
            errors.append(f"PAXG={exc}")

    # 3. Kraken Public OHLC fallback for EURUSD / GBPUSD
    if asset.get("kraken"):
        try:
            r = http_request(
                "GET",
                "https://api.kraken.com/0/public/OHLC",
                params={"pair": asset["kraken"], "interval": tf_cfg["kraken"]},
                timeout=8,
            )
            r.raise_for_status()
            res = r.json().get("result", {})
            pair_key = next((k for k in res.keys() if k != "last"), None)
            rows = res.get(pair_key, []) if pair_key else []
            if len(rows) >= 60:
                candles = normalize_candles([
                    {"time": int(row[0]), "open": float(row[1]), "high": float(row[2]), "low": float(row[3]), "close": float(row[4])}
                    for row in rows[-160:]
                ])
                if len(candles) >= 60:
                    return candles, "Kraken FX Public API"
        except Exception as exc:
            errors.append(f"Kraken={exc}")

    # 4. Frankfurter ECB daily + Open ExchangeRate live spot fallback
    if asset.get("base") and asset.get("quote"):
        try:
            end_dt = datetime.now(timezone.utc).date()
            start_ts = time.time() - 210 * 86400
            start_dt = datetime.fromtimestamp(start_ts, tz=timezone.utc).date()
            r = http_request(
                "GET",
                f"https://api.frankfurter.app/{start_dt.isoformat()}..{end_dt.isoformat()}",
                params={"from": asset["base"], "to": asset["quote"]},
                timeout=8,
            )
            r.raise_for_status()
            rates = r.json().get("rates", {})
            if len(rates) >= 60:
                dates = sorted(rates.keys())
                raw = []
                prev = float(rates[dates[0]][asset["quote"]])
                for dt in dates:
                    val = float(rates[dt][asset["quote"]])
                    ts = int(datetime.strptime(dt, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())
                    spread = max(abs(val - prev) * 0.35, val * 0.0012)
                    raw.append({
                        "time": ts,
                        "open": prev,
                        "high": max(prev, val) + spread,
                        "low": min(prev, val) - spread,
                        "close": val,
                    })
                    prev = val
                candles = normalize_candles(raw)
                if len(candles) >= 60:
                    return candles, "Frankfurter ECB (Daily Fallback)"
        except Exception as exc:
            errors.append(f"Frankfurter={exc}")

    raise RuntimeError(f"Forex feed failed for {symbol} ({'; '.join(errors)})")


# =============================================================================
# QUANTITATIVE TECHNICAL ANALYSIS ENGINE (MATCHES WEB DASHBOARD)
# =============================================================================
def compute_ema(values: list[float], period: int) -> list[float | None]:
    res: list[float | None] = [None] * len(values)
    if len(values) < period:
        return res
    ema = sum(values[:period]) / period
    res[period - 1] = ema
    k = 2.0 / (period + 1.0)
    for i in range(period, len(values)):
        ema = values[i] * k + ema * (1.0 - k)
        res[i] = ema
    return res


def compute_rsi(closes: list[float], period: int = 14) -> list[float | None]:
    res: list[float | None] = [None] * len(closes)
    if len(closes) <= period:
        return res
    gain_sum = 0.0
    loss_sum = 0.0
    for i in range(1, period + 1):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gain_sum += diff
        else:
            loss_sum += abs(diff)
    avg_gain = gain_sum / period
    avg_loss = loss_sum / period
    res[period] = 100.0 if avg_loss == 0 else 100.0 - (100.0 / (1.0 + avg_gain / avg_loss))

    for i in range(period + 1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gain = diff if diff > 0 else 0.0
        loss = abs(diff) if diff < 0 else 0.0
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        if avg_loss == 0:
            res[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            res[i] = 100.0 - (100.0 / (1.0 + rs))
    return res


def compute_macd(closes: list[float], fast: int = 12, slow: int = 26, signal_period: int = 9):
    ema_fast = compute_ema(closes, fast)
    ema_slow = compute_ema(closes, slow)
    macd_line: list[float | None] = [None] * len(closes)
    valid_vals: list[float] = []
    valid_idx: list[int] = []
    for i in range(len(closes)):
        if ema_fast[i] is not None and ema_slow[i] is not None:
            v = float(ema_fast[i]) - float(ema_slow[i])
            macd_line[i] = v
            valid_vals.append(v)
            valid_idx.append(i)

    signal_line: list[float | None] = [None] * len(closes)
    histogram: list[float | None] = [None] * len(closes)
    sig_vals = compute_ema(valid_vals, signal_period)
    for j, sv in enumerate(sig_vals):
        if sv is not None:
            idx = valid_idx[j]
            signal_line[idx] = sv
            histogram[idx] = float(macd_line[idx]) - sv
    return macd_line, signal_line, histogram


def compute_atr(candles: list[dict[str, float]], period: int = 14) -> list[float | None]:
    trs = [candles[0]["high"] - candles[0]["low"]]
    for i in range(1, len(candles)):
        h = candles[i]["high"]
        l = candles[i]["low"]
        pc = candles[i - 1]["close"]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    atr: list[float | None] = [None] * len(candles)
    if len(candles) <= period:
        return atr
    val = sum(trs[1 : period + 1]) / period
    atr[period] = val
    for i in range(period + 1, len(candles)):
        val = (val * (period - 1) + trs[i]) / period
        atr[i] = val
    return atr


def analyze_candles(candles: list[dict[str, float]]) -> dict[str, Any]:
    closes = [c["close"] for c in candles]
    ema20_arr = compute_ema(closes, 20)
    ema50_arr = compute_ema(closes, 50)
    rsi_arr = compute_rsi(closes, 14)
    macd_line, signal_line, histogram = compute_macd(closes, 12, 26, 9)
    atr_arr = compute_atr(candles, 14)

    last_idx = len(candles) - 1
    prev_idx = last_idx - 1

    price = candles[last_idx]["close"]
    prev_close = candles[prev_idx]["close"]
    ema20 = float(ema20_arr[last_idx])
    ema50 = float(ema50_arr[last_idx])
    prev_ema20 = float(ema20_arr[prev_idx])
    prev_ema50 = float(ema50_arr[prev_idx])
    rsi = float(rsi_arr[last_idx])
    prev_rsi = float(rsi_arr[prev_idx])
    macd = float(macd_line[last_idx])
    macd_sig = float(signal_line[last_idx])
    hist = float(histogram[last_idx])
    prev_hist = float(histogram[prev_idx])
    atr = float(atr_arr[last_idx] or price * 0.01)

    score = 0

    # 1. EMA Trend Structure (-2 to +2)
    if price > ema20 and ema20 > ema50:
        score += 2
        trend_label = "Strong Uptrend"
    elif price > ema50 and ema20 >= ema50:
        score += 1
        trend_label = "Bullish Bias"
    elif price < ema20 and ema20 < ema50:
        score -= 2
        trend_label = "Strong Downtrend"
    elif price < ema50 and ema20 <= ema50:
        score -= 1
        trend_label = "Bearish Bias"
    else:
        trend_label = "Mixed / Transition"

    # 2. Dynamic Crossover / Reclaim (-1 to +1)
    if prev_ema20 <= prev_ema50 and ema20 > ema50:
        score += 1
    elif prev_ema20 >= prev_ema50 and ema20 < ema50:
        score -= 1
    elif price > ema20 and prev_close <= prev_ema20:
        score += 1
    elif price < ema20 and prev_close >= prev_ema20:
        score -= 1

    # 3. RSI (14) (-2 to +2)
    if rsi <= 30:
        score += 2
        rsi_state = "Oversold"
    elif 30 < rsi < 45 and rsi > prev_rsi:
        score += 1
        rsi_state = "Recovering Upward"
    elif 50 <= rsi <= 68 and rsi >= prev_rsi:
        score += 1
        rsi_state = "Bullish Momentum"
    elif rsi >= 70:
        score -= 2
        rsi_state = "Overbought"
    elif 55 < rsi < 70 and rsi < prev_rsi:
        score -= 1
        rsi_state = "Momentum Cooling"
    elif 30 < rsi <= 50 and rsi <= prev_rsi:
        score -= 1
        rsi_state = "Bearish Momentum"
    else:
        rsi_state = "Balanced"

    # 4. MACD (12, 26, 9) (-2 to +2)
    bull_cross = prev_hist <= 0 and hist > 0
    bear_cross = prev_hist >= 0 and hist < 0
    if bull_cross or (macd > macd_sig and hist > 0 and hist > prev_hist):
        score += 2
        macd_state = "Bullish Crossover" if bull_cross else "Expanding Bullish"
    elif macd > macd_sig:
        score += 1
        macd_state = "Positive Bias"
    elif bear_cross or (macd < macd_sig and hist < 0 and hist < prev_hist):
        score -= 2
        macd_state = "Bearish Crossover" if bear_cross else "Expanding Bearish"
    elif macd < macd_sig:
        score -= 1
        macd_state = "Negative Bias"
    else:
        macd_state = "Neutral"

    if score >= 4:
        verdict, direction = "STRONG BUY", "BUY"
    elif score >= 2:
        verdict, direction = "BUY", "BUY"
    elif score <= -4:
        verdict, direction = "STRONG SELL", "SELL"
    elif score <= -2:
        verdict, direction = "SELL", "SELL"
    else:
        verdict, direction = "NEUTRAL / HOLD", "NEUTRAL"

    swing_window = candles[-14:]
    swing_low = min(c["low"] for c in swing_window)
    swing_high = max(c["high"] for c in swing_window)

    entry = price
    if direction == "BUY":
        sl = min(swing_low - 0.25 * atr, entry - 1.5 * atr)
        if entry - sl < 0.8 * atr:
            sl = entry - 1.2 * atr
        risk = entry - sl
        tp1 = entry + 2.0 * risk
        tp2 = entry + 3.0 * risk
    elif direction == "SELL":
        sl = max(swing_high + 0.25 * atr, entry + 1.5 * atr)
        if sl - entry < 0.8 * atr:
            sl = entry + 1.2 * atr
        risk = sl - entry
        tp1 = entry - 2.0 * risk
        tp2 = entry - 3.0 * risk
    else:
        risk = 1.5 * atr
        sl = min(swing_low, entry - risk)
        tp1 = entry + (entry - sl) * 2.0
        tp2 = entry + (entry - sl) * 3.0

    return {
        "verdict": verdict,
        "direction": direction,
        "score": score,
        "price": price,
        "entry": entry,
        "sl": sl,
        "tp1": tp1,
        "tp2": tp2,
        "atr": atr,
        "rsi": rsi,
        "rsi_state": rsi_state,
        "macd": macd,
        "macd_sig": macd_sig,
        "hist": hist,
        "macd_state": macd_state,
        "ema20": ema20,
        "ema50": ema50,
        "trend_label": trend_label,
        "candle_time": candles[last_idx]["time"],
        "last_high": candles[last_idx]["high"],
        "last_low": candles[last_idx]["low"],
    }


# =============================================================================
# TELEGRAM NOTIFIER
# =============================================================================
def send_telegram(cfg: Config, html_message: str) -> bool:
    if not cfg.telegram_token or not cfg.telegram_chat_id:
        return False
    url = f"https://api.telegram.org/bot{cfg.telegram_token}/sendMessage"
    try:
        r = http_request(
            "POST",
            url,
            json_body={
                "chat_id": cfg.telegram_chat_id,
                "text": html_message,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=10,
        )
        if not r.ok:
            logger.error("Telegram API error (%s): %s", r.status_code, r.text)
            return False
        return True
    except Exception as exc:
        logger.error("Telegram send failed: %s", exc)
        return False


def format_signal_telegram(symbol: str, label: str, tf: str, decimals: int, a: dict[str, Any], source: str) -> str:
    badge = "🟢" if a["direction"] == "BUY" else "🔴" if a["direction"] == "SELL" else "🟡"
    fmt = f".{decimals}f"
    return (
        f"{badge} <b>{label} ({tf}) — {a['verdict']}</b>\n"
        f"Score: <code>{a['score']:+d}/6</code> | Source: {source}\n\n"
        f"• <b>Entry:</b> <code>{a['entry']:{fmt}}</code>\n"
        f"• <b>Stop Loss:</b> <code>{a['sl']:{fmt}}</code>\n"
        f"• <b>Take Profit 1 (1:2):</b> <code>{a['tp1']:{fmt}}</code>\n"
        f"• <b>Take Profit 2 (1:3):</b> <code>{a['tp2']:{fmt}}</code>\n\n"
        f"RSI(14): <code>{a['rsi']:.1f}</code> ({a['rsi_state']})\n"
        f"MACD: {a['macd_state']} | Trend: {a['trend_label']}\n"
        f"<i>Educational signal — verify risk before trading.</i>"
    )


# =============================================================================
# BINANCE SPOT / TESTNET AUTO-EXECUTION CLIENT (OPTION B)
# =============================================================================
class BinanceTrader:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.base_url = "https://testnet.binance.vision" if cfg.mode == "testnet" else "https://api.binance.com"
        self.filters_cache: dict[str, dict[str, str]] = {}

    def _sign(self, params: dict[str, Any]) -> dict[str, Any]:
        payload = dict(params)
        payload["timestamp"] = int(time.time() * 1000)
        payload.setdefault("recvWindow", 5000)
        query = urlencode(payload)
        sig = hmac.new(
            self.cfg.binance_api_secret.encode("utf-8"),
            query.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        payload["signature"] = sig
        return payload

    def _headers(self) -> dict[str, str]:
        return {"X-MBX-APIKEY": self.cfg.binance_api_key}

    def get_usdt_balance(self) -> float:
        params = self._sign({})
        r = http_request("GET", f"{self.base_url}/api/v3/account", params=params, headers=self._headers(), timeout=10)
        r.raise_for_status()
        for bal in r.json().get("balances", []):
            if bal.get("asset") == "USDT":
                return float(bal.get("free", 0.0))
        return 0.0

    def get_asset_balance(self, asset: str) -> float:
        params = self._sign({})
        r = http_request("GET", f"{self.base_url}/api/v3/account", params=params, headers=self._headers(), timeout=10)
        r.raise_for_status()
        for bal in r.json().get("balances", []):
            if bal.get("asset") == asset:
                return float(bal.get("free", 0.0))
        return 0.0

    def get_symbol_filters(self, symbol: str) -> dict[str, str]:
        if symbol in self.filters_cache:
            return self.filters_cache[symbol]
        r = http_request("GET", f"{self.base_url}/api/v3/exchangeInfo", params={"symbol": symbol}, timeout=10)
        r.raise_for_status()
        sym_info = r.json()["symbols"][0]
        lot = next(f for f in sym_info["filters"] if f["filterType"] == "LOT_SIZE")
        tick = next(f for f in sym_info["filters"] if f["filterType"] == "PRICE_FILTER")
        notional_f = next((f for f in sym_info["filters"] if f["filterType"] in ("NOTIONAL", "MIN_NOTIONAL")), {})
        info = {
            "baseAsset": sym_info["baseAsset"],
            "stepSize": lot["stepSize"],
            "minQty": lot["minQty"],
            "tickSize": tick["tickSize"],
            "minNotional": notional_f.get("minNotional", "10.0"),
        }
        self.filters_cache[symbol] = info
        return info

    @staticmethod
    def round_step(value: float, step_str: str) -> str:
        step = Decimal(step_str).normalize()
        d_val = Decimal(str(value))
        quantized = (d_val // step) * step
        return format(quantized.normalize(), "f")

    def place_spot_buy_with_oco(self, symbol: str, risk_pct: float, entry: float, sl: float, tp1: float) -> dict[str, Any]:
        filters = self.get_symbol_filters(symbol)
        usdt_free = self.get_usdt_balance()
        risk_usdt = usdt_free * (risk_pct / 100.0)
        stop_dist = max(entry - sl, entry * 0.005)
        raw_qty = min(risk_usdt / stop_dist, (usdt_free * 0.25) / entry)

        qty_str = self.round_step(raw_qty, filters["stepSize"])
        qty_f = float(qty_str)
        min_notional = float(filters["minNotional"])
        if qty_f <= 0 or qty_f * entry < min_notional:
            raise RuntimeError(f"Order size too small for {symbol}: notional={qty_f * entry:.2f} < {min_notional}")

        # 1. Place MARKET BUY entry
        buy_params = self._sign({
            "symbol": symbol,
            "side": "BUY",
            "type": "MARKET",
            "quantity": qty_str,
        })
        r_buy = http_request("POST", f"{self.base_url}/api/v3/order", data=buy_params, headers=self._headers(), timeout=10)
        r_buy.raise_for_status()
        buy_order = r_buy.json()
        executed_qty = float(buy_order.get("executedQty", qty_str))
        sell_qty_str = self.round_step(executed_qty * 0.998, filters["stepSize"])

        # 2. Place OCO Take-Profit + Stop-Loss protective exit
        tp_str = self.round_step(tp1, filters["tickSize"])
        sl_trigger_str = self.round_step(sl, filters["tickSize"])
        sl_limit_str = self.round_step(sl * 0.997, filters["tickSize"])

        oco_result = None
        try:
            oco_params = self._sign({
                "symbol": symbol,
                "side": "SELL",
                "quantity": sell_qty_str,
                "aboveType": "LIMIT_MAKER",
                "abovePrice": tp_str,
                "belowType": "STOP_LOSS_LIMIT",
                "belowStopPrice": sl_trigger_str,
                "belowPrice": sl_limit_str,
                "belowTimeInForce": "GTC",
            })
            r_oco = http_request("POST", f"{self.base_url}/api/v3/orderList/oco", data=oco_params, headers=self._headers(), timeout=10)
            r_oco.raise_for_status()
            oco_result = r_oco.json()
        except Exception as exc:
            logger.warning("OCO exit failed for %s (%s); placing standalone STOP_LOSS_LIMIT.", symbol, exc)
            sl_params = self._sign({
                "symbol": symbol,
                "side": "SELL",
                "type": "STOP_LOSS_LIMIT",
                "timeInForce": "GTC",
                "quantity": sell_qty_str,
                "stopPrice": sl_trigger_str,
                "price": sl_limit_str,
            })
            r_sl = http_request("POST", f"{self.base_url}/api/v3/order", data=sl_params, headers=self._headers(), timeout=10)
            r_sl.raise_for_status()
            oco_result = r_sl.json()

        return {"buy": buy_order, "exit": oco_result, "qty": sell_qty_str}


# =============================================================================
# STATE & PAPER TRADING PERSISTENCE
# =============================================================================
def load_state(cfg: Config) -> dict[str, Any]:
    if STATE_PATH.exists():
        try:
            with STATE_PATH.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, dict):
                    data.setdefault("last_alerts", {})
                    data.setdefault("open_positions", {})
                    data.setdefault("stats", {"wins": 0, "losses": 0, "realized_pnl_usdt": 0.0})
                    data.setdefault("paper_balance_usdt", cfg.paper_balance_usdt)
                    return data
        except Exception as exc:
            logger.warning("Could not parse state.json (%s); starting fresh.", exc)

    return {
        "paper_balance_usdt": cfg.paper_balance_usdt,
        "last_alerts": {},
        "open_positions": {},
        "stats": {"wins": 0, "losses": 0, "realized_pnl_usdt": 0.0},
    }


def save_state(state: dict[str, Any]) -> None:
    tmp = STATE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)
    tmp.replace(STATE_PATH)


def append_trade_csv(row: dict[str, Any]) -> None:
    exists = TRADES_CSV_PATH.exists()
    fieldnames = ["timestamp_utc", "mode", "symbol", "timeframe", "side", "qty", "entry", "exit", "pnl_usdt", "outcome"]
    with TRADES_CSV_PATH.open("a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        if not exists:
            writer.writeheader()
        writer.writerow(row)


def update_paper_positions(cfg: Config, state: dict[str, Any], symbol: str, candles: list[dict[str, float]], decimals: int) -> None:
    pos = state["open_positions"].get(symbol)
    if not pos:
        return

    latest = candles[-1]
    high = latest["high"]
    low = latest["low"]
    side = pos["side"]
    entry = pos["entry"]
    sl = pos["sl"]
    tp1 = pos["tp1"]
    tp2 = pos["tp2"]
    qty = pos["remaining_qty"]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    fmt = f".{decimals}f"

    def close_position(exit_price: float, close_qty: float, outcome: str) -> None:
        pnl = (exit_price - entry) * close_qty if side == "BUY" else (entry - exit_price) * close_qty
        state["paper_balance_usdt"] = round(state["paper_balance_usdt"] + pnl, 4)
        state["stats"]["realized_pnl_usdt"] = round(state["stats"]["realized_pnl_usdt"] + pnl, 4)
        if pnl >= 0:
            state["stats"]["wins"] += 1
        else:
            state["stats"]["losses"] += 1

        append_trade_csv({
            "timestamp_utc": now_iso,
            "mode": "paper",
            "symbol": symbol,
            "timeframe": pos["timeframe"],
            "side": side,
            "qty": round(close_qty, 6),
            "entry": round(entry, decimals),
            "exit": round(exit_price, decimals),
            "pnl_usdt": round(pnl, 2),
            "outcome": outcome,
        })
        logger.info("[PAPER %s] %s closed @ %s | PnL: %+.2f USDT (%s)", outcome, symbol, f"{exit_price:{fmt}}", pnl, side)
        send_telegram(
            cfg,
            f"📊 <b>Paper Trade Closed — {symbol}</b>\n"
            f"Outcome: <b>{outcome}</b> ({side})\n"
            f"Entry: <code>{entry:{fmt}}</code> → Exit: <code>{exit_price:{fmt}}</code>\n"
            f"Realized PnL: <b>{pnl:+.2f} USDT</b>\n"
            f"Virtual Balance: <code>{state['paper_balance_usdt']:.2f} USDT</code>",
        )

    # Check Stop Loss & Take Profits
    if side == "BUY":
        if low <= sl:
            close_position(sl, qty, "BREAKEVEN_EXIT" if pos.get("tp1_hit") else "STOP_LOSS")
            del state["open_positions"][symbol]
        elif high >= tp2:
            close_position(tp2, qty, "TP2_HIT")
            del state["open_positions"][symbol]
        elif not pos.get("tp1_hit") and high >= tp1:
            half = qty * 0.5
            close_position(tp1, half, "TP1_PARTIAL")
            pos["remaining_qty"] = qty - half
            pos["tp1_hit"] = True
            pos["sl"] = entry  # Move SL to breakeven
    else:
        if high >= sl:
            close_position(sl, qty, "BREAKEVEN_EXIT" if pos.get("tp1_hit") else "STOP_LOSS")
            del state["open_positions"][symbol]
        elif low <= tp2:
            close_position(tp2, qty, "TP2_HIT")
            del state["open_positions"][symbol]
        elif not pos.get("tp1_hit") and low <= tp1:
            half = qty * 0.5
            close_position(tp1, half, "TP1_PARTIAL")
            pos["remaining_qty"] = qty - half
            pos["tp1_hit"] = True
            pos["sl"] = entry


def maybe_open_trade(
    cfg: Config,
    state: dict[str, Any],
    trader: BinanceTrader | None,
    symbol: str,
    tf: str,
    analysis: dict[str, Any],
    decimals: int,
) -> None:
    if abs(analysis["score"]) < cfg.min_signal_score:
        return
    if symbol in state["open_positions"]:
        return
    if len(state["open_positions"]) >= cfg.max_open_trades:
        return

    asset = ASSET_CATALOG[symbol]
    entry = analysis["entry"]
    sl = analysis["sl"]
    risk_dist = abs(entry - sl)
    if risk_dist <= 0:
        return

    fmt = f".{decimals}f"

    if cfg.mode == "paper":
        balance = state["paper_balance_usdt"]
        risk_usdt = balance * (cfg.risk_per_trade_pct / 100.0)
        # Cap notional exposure at 25% of virtual equity
        qty = min(risk_usdt / risk_dist, (balance * 0.25) / entry)
        state["open_positions"][symbol] = {
            "symbol": symbol,
            "timeframe": tf,
            "side": analysis["direction"],
            "entry": entry,
            "sl": sl,
            "tp1": analysis["tp1"],
            "tp2": analysis["tp2"],
            "initial_qty": qty,
            "remaining_qty": qty,
            "tp1_hit": False,
            "opened_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.info(
            "[PAPER OPEN] %s %s (%s) @ %s | SL=%s TP1=%s TP2=%s Qty=%.6f",
            analysis["direction"], symbol, tf, f"{entry:{fmt}}",
            f"{sl:{fmt}}", f"{analysis['tp1']:{fmt}}", f"{analysis['tp2']:{fmt}}", qty,
        )
        send_telegram(
            cfg,
            f"🤖 <b>Paper Position Opened — {asset['label']} ({tf})</b>\n"
            f"Side: <b>{analysis['verdict']}</b> | Qty: <code>{qty:.5f}</code>\n"
            f"Entry: <code>{entry:{fmt}}</code> | SL: <code>{sl:{fmt}}</code>\n"
            f"TP1: <code>{analysis['tp1']:{fmt}}</code> | TP2: <code>{analysis['tp2']:{fmt}}</code>",
        )
        return

    # Live / Testnet Binance Spot execution (Crypto BUY setups only)
    if trader and asset["market"] == "crypto" and analysis["direction"] == "BUY":
        try:
            res = trader.place_spot_buy_with_oco(symbol, cfg.risk_per_trade_pct, entry, sl, analysis["tp1"])
            logger.info("[%s ORDER] %s BUY qty=%s executed.", cfg.mode.upper(), symbol, res["qty"])
            send_telegram(
                cfg,
                f"⚡ <b>{cfg.mode.upper()} Binance Order Filled — {asset['label']}</b>\n"
                f"Side: <b>BUY</b> | Qty: <code>{res['qty']}</code>\n"
                f"Protective OCO SL/TP1 placed.",
            )
        except Exception as exc:
            logger.error("[%s ORDER FAILED] %s: %s", cfg.mode.upper(), symbol, exc)
            send_telegram(cfg, f"⚠️ <b>{cfg.mode.upper()} Order Error ({symbol}):</b> {exc}")


# =============================================================================
# SCANNER ORCHESTRATION
# =============================================================================
def run_scan_cycle(cfg: Config, state: dict[str, Any], trader: BinanceTrader | None) -> None:
    all_symbols = cfg.crypto_pairs + cfg.forex_pairs
    snapshot: list[dict[str, Any]] = []
    candles_cache: dict[tuple[str, str], tuple[list[dict[str, float]], str]] = {}

    for symbol in all_symbols:
        asset = ASSET_CATALOG.get(symbol)
        if not asset:
            logger.warning("Skipping unknown symbol: %s", symbol)
            continue

        for tf in cfg.timeframes:
            try:
                if asset["market"] == "crypto":
                    candles, source = fetch_crypto_candles(symbol, tf)
                else:
                    candles, source = fetch_forex_candles(symbol, tf)
                candles_cache[(symbol, tf)] = (candles, source)
            except Exception as exc:
                logger.warning("Fetch error %s [%s]: %s", symbol, tf, exc)
                continue

            # Update open paper position on first timeframe fetch for this symbol
            if cfg.mode == "paper" and tf == cfg.timeframes[0]:
                update_paper_positions(cfg, state, symbol, candles, asset["decimals"])

            analysis = analyze_candles(candles)
            alert_key = f"{symbol}:{tf}"
            prev_record = state["last_alerts"].get(alert_key, {})
            prev_verdict = prev_record.get("verdict")
            prev_candle_time = prev_record.get("candle_time")

            snapshot.append({
                "symbol": symbol,
                "label": asset["label"],
                "market": asset["market"],
                "timeframe": tf,
                "verdict": analysis["verdict"],
                "direction": analysis["direction"],
                "score": analysis["score"],
                "price": round(analysis["price"], asset["decimals"]),
                "entry": round(analysis["entry"], asset["decimals"]),
                "sl": round(analysis["sl"], asset["decimals"]),
                "tp1": round(analysis["tp1"], asset["decimals"]),
                "tp2": round(analysis["tp2"], asset["decimals"]),
                "rsi": round(analysis["rsi"], 2),
                "macd_state": analysis["macd_state"],
                "trend": analysis["trend_label"],
                "source": source,
            })

            is_actionable = abs(analysis["score"]) >= cfg.min_signal_score
            is_new_flip = analysis["verdict"] != prev_verdict
            is_new_candle = analysis["candle_time"] != prev_candle_time

            if is_actionable and is_new_flip and is_new_candle:
                fmt = f".{asset['decimals']}f"
                logger.info(
                    "[SIGNAL] %s (%s) -> %s (score %+d) | Entry=%s SL=%s TP1=%s TP2=%s [%s]",
                    asset["label"], tf, analysis["verdict"], analysis["score"],
                    f"{analysis['entry']:{fmt}}", f"{analysis['sl']:{fmt}}",
                    f"{analysis['tp1']:{fmt}}", f"{analysis['tp2']:{fmt}}", source,
                )
                msg = format_signal_telegram(symbol, asset["label"], tf, asset["decimals"], analysis, source)
                send_telegram(cfg, msg)
                maybe_open_trade(cfg, state, trader, symbol, tf, analysis, asset["decimals"])

            state["last_alerts"][alert_key] = {
                "verdict": analysis["verdict"],
                "score": analysis["score"],
                "candle_time": analysis["candle_time"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

    # Save snapshot for inspection / optional static integration
    with SIGNALS_JSON_PATH.open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "updated_utc": datetime.now(timezone.utc).isoformat(),
                "mode": cfg.mode,
                "signals": snapshot,
            },
            fh,
            indent=2,
        )

    save_state(state)
    logger.info(
        "Scan complete: %d pair-timeframes evaluated | Mode=%s | PaperBal=%.2f USDT | Open=%d",
        len(snapshot), cfg.mode.upper(), state["paper_balance_usdt"], len(state["open_positions"]),
    )


def print_status(cfg: Config) -> None:
    state = load_state(cfg)
    stats = state["stats"]
    total = stats["wins"] + stats["losses"]
    win_rate = (stats["wins"] / total * 100.0) if total > 0 else 0.0

    print("\n=== QuantPulse Bot Status ===")
    print(f"Mode:             {cfg.mode.upper()}")
    print(f"Paper Balance:    {state['paper_balance_usdt']:.2f} USDT")
    print(f"Realized PnL:     {stats['realized_pnl_usdt']:+.2f} USDT")
    print(f"Closed Trades:    {total} (Wins: {stats['wins']}, Losses: {stats['losses']}, Win Rate: {win_rate:.1f}%)")
    print(f"Open Positions:   {len(state['open_positions'])}")
    for sym, pos in state["open_positions"].items():
        print(f"  - {sym} [{pos['timeframe']}] {pos['side']} @ {pos['entry']} (SL={pos['sl']}, TP1={pos['tp1']}, TP2={pos['tp2']})")
    print()


# =============================================================================
# MAIN ENTRYPOINT
# =============================================================================
def main() -> int:
    parser = argparse.ArgumentParser(description="QuantPulse All-in-One Forex & Crypto Signal Bot")
    parser.add_argument("--once", action="store_true", help="Run a single scan cycle and exit (for cron / GitHub Actions).")
    parser.add_argument("--status", action="store_true", help="Print portfolio state and exit.")
    parser.add_argument("--test-telegram", action="store_true", help="Send a test Telegram alert and exit.")
    args = parser.parse_args()

    cfg = Config.from_env()

    if args.status:
        print_status(cfg)
        return 0

    if args.test_telegram:
        ok = send_telegram(cfg, "✅ <b>QuantPulse Bot Connected!</b>\nTelegram alerts are active and ready.")
        print("Telegram test sent successfully." if ok else "Failed to send Telegram test. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")
        return 0 if ok else 1

    trader: BinanceTrader | None = None
    if cfg.mode in {"testnet", "live"}:
        if not cfg.binance_api_key or not cfg.binance_api_secret:
            logger.error("MODE=%s requires BINANCE_API_KEY and BINANCE_API_SECRET in .env. Falling back to 'paper' mode.", cfg.mode)
            cfg.mode = "paper"
        else:
            trader = BinanceTrader(cfg)

    state = load_state(cfg)

    running = True

    def handle_stop(signum: int, _frame: Any) -> None:
        nonlocal running
        logger.info("Received signal %s; shutting down gracefully...", signum)
        running = False

    signal.signal(signal.SIGINT, handle_stop)
    signal.signal(signal.SIGTERM, handle_stop)

    logger.info(
        "Starting QuantPulse Bot | Mode=%s | Crypto=%s | Forex=%s | TF=%s | Telegram=%s",
        cfg.mode.upper(),
        ",".join(cfg.crypto_pairs),
        ",".join(cfg.forex_pairs),
        ",".join(cfg.timeframes),
        "ENABLED" if (cfg.telegram_token and cfg.telegram_chat_id) else "DISABLED",
    )

    if args.once:
        run_scan_cycle(cfg, state, trader)
        return 0

    while running:
        started = time.monotonic()
        try:
            run_scan_cycle(cfg, state, trader)
        except Exception as exc:
            logger.exception("Unexpected error during scan cycle: %s", exc)
        elapsed = time.monotonic() - started
        sleep_for = max(5.0, cfg.scan_interval_seconds - elapsed)
        deadline = time.monotonic() + sleep_for
        while running and time.monotonic() < deadline:
            time.sleep(min(1.0, deadline - time.monotonic()))

    save_state(state)
    logger.info("QuantPulse Bot stopped cleanly.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
