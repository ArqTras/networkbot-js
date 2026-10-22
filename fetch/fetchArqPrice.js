const axios = require('axios');

const TRADE_TICKER_URLS = [
  'https://trade.privacydatacoin.com/api/ticker',
  'https://api.trade.privacydatacoin.com/api/ticker',
];

const TRADE_SYMBOLS = ['ARQX-BTCX', 'ARQ-BTCX'];

function pickTicker(payload) {
  const tickers = Array.isArray(payload)
    ? payload
    : (payload && Array.isArray(payload.tickers) ? payload.tickers : null);
  if (!tickers) return null;
  for (const symbol of TRADE_SYMBOLS) {
    const hit = tickers.find((t) => t && String(t.symbol).toUpperCase() === symbol);
    if (hit) return hit;
  }
  return null;
}

function fromTradeTicker(ticker) {
  const raw =
    ticker.last ??
    ticker.price ??
    ticker.bid ??
    ticker.ask ??
    null;
  if (raw === null || raw === undefined) return null;

  const priceNum = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(priceNum) || priceNum <= 0) return null;

  const priceBtc = priceNum.toFixed(8);
  const priceSat = Math.round(priceNum * 1e8);
  let priceUsd = null;
  if (ticker.lastUsd !== undefined && ticker.lastUsd !== null) {
    const usd = typeof ticker.lastUsd === 'number' ? ticker.lastUsd : parseFloat(ticker.lastUsd);
    if (Number.isFinite(usd) && usd > 0) priceUsd = usd;
  }
  return { priceBtc, priceSat, priceUsd };
}

module.exports = async () => {
  // Primary: PrivacyDataCoin Trade (ARQX/BTCX ≈ ARQ/BTC)
  for (const url of TRADE_TICKER_URLS) {
    try {
      const response = await axios.get(url, { timeout: 8000 });
      const ticker = pickTicker(response.data);
      const parsed = ticker ? fromTradeTicker(ticker) : null;
      if (parsed) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Price] Trade success from ${url} ${ticker.symbol}: ${parsed.priceBtc} BTCX`);
        }
        return parsed;
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Price] Trade error (${url}):`, e.message || e);
      }
    }
  }

  // Fallback: TradeOgre ARQ/BTC
  try {
    const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc', { timeout: 8000 });
    if (response.data && response.data.price) {
      const priceNum = parseFloat(response.data.price);
      if (Number.isFinite(priceNum) && priceNum > 0) {
        return {
          priceBtc: priceNum.toFixed(8),
          priceSat: Math.round(priceNum * 1e8),
          priceUsd: null,
        };
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[Price] TradeOgre error:`, e.message || e);
    }
  }

  return null;
};
