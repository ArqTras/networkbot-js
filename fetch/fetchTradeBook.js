const axios = require('axios');

const TRADE_BASES = [
  'https://trade.privacydatacoin.com',
  'https://api.trade.privacydatacoin.com',
];

const SYMBOL = 'ARQX-BTCX';
const BASE_TICKER = 'ARQX';
const QUOTE_TICKER = 'BTCX';

async function getJson(path) {
  let lastErr = null;
  for (const base of TRADE_BASES) {
    try {
      const res = await axios.get(base + path, { timeout: 10000 });
      if (res.data) return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

function decimalsFromTokens(tokens, ticker, assetId, fallback) {
  const list = (tokens && tokens.tokens) || tokens || [];
  if (!Array.isArray(list)) return fallback;
  const byId = assetId
    ? list.find((t) => t && String(t.assetId).toLowerCase() === String(assetId).toLowerCase())
    : null;
  if (byId && Number.isFinite(Number(byId.decimals))) return Number(byId.decimals);
  const byTicker = list.find((t) => t && String(t.ticker).toUpperCase() === ticker);
  if (byTicker && Number.isFinite(Number(byTicker.decimals))) return Number(byTicker.decimals);
  return fallback;
}

function atomicToHuman(atomic, decimals) {
  try {
    const v = BigInt(String(atomic || '0'));
    if (v <= 0n) return 0;
    const neg = v < 0n;
    const abs = neg ? -v : v;
    const s = abs.toString().padStart(decimals + 1, '0');
    const whole = s.slice(0, -decimals) || '0';
    const frac = s.slice(-decimals);
    const n = Number(`${whole}.${frac}`);
    return Number.isFinite(n) ? (neg ? -n : n) : 0;
  } catch {
    const n = Number(atomic) / 10 ** decimals;
    return Number.isFinite(n) ? n : 0;
  }
}

function buildLevels(orders, baseId, quoteId, baseDec, quoteDec) {
  const asks = [];
  const bids = [];
  for (const o of orders || []) {
    const status = String(o.status || '').toLowerCase();
    if (status && status !== 'open' && status !== 'partial') continue;
    const oa = String(o.offerAssetId || '');
    const wa = String(o.wantAssetId || '');
    if (!((oa === baseId && wa === quoteId) || (oa === quoteId && wa === baseId))) continue;

    const offerLeft = o.offerLeft != null ? o.offerLeft : o.offerAmount;
    const wantLeft = o.wantLeft != null ? o.wantLeft : o.wantAmount;
    if (BigInt(String(offerLeft || '0')) <= 0n) continue;
    if (BigInt(String(wantLeft || '0')) <= 0n) continue;

    if (oa === baseId && wa === quoteId) {
      // sell base for quote → ask
      const baseAmt = atomicToHuman(offerLeft, baseDec);
      const quoteAmt = atomicToHuman(wantLeft, quoteDec);
      if (baseAmt <= 0) continue;
      asks.push({
        price: quoteAmt / baseAmt,
        baseAmount: baseAmt,
        quoteAmount: quoteAmt,
      });
    } else if (oa === quoteId && wa === baseId) {
      // buy base with quote → bid
      const quoteAmt = atomicToHuman(offerLeft, quoteDec);
      const baseAmt = atomicToHuman(wantLeft, baseDec);
      if (baseAmt <= 0) continue;
      bids.push({
        price: quoteAmt / baseAmt,
        baseAmount: baseAmt,
        quoteAmount: quoteAmt,
      });
    }
  }
  asks.sort((a, b) => a.price - b.price);
  bids.sort((a, b) => b.price - a.price);
  return { asks, bids };
}

function pickDexPair(pairsPayload, baseId, quoteId) {
  const pairs = (pairsPayload && pairsPayload.pairs) || [];
  return (
    pairs.find(
      (p) =>
        p &&
        String(p.offerAssetId) === baseId &&
        String(p.wantAssetId) === quoteId
    ) || null
  );
}

module.exports = async function fetchTradeBook() {
  const [ticker, ordersPayload, tokens, dexPairs] = await Promise.all([
    getJson('/api/ticker?symbol=' + encodeURIComponent(SYMBOL)).catch(() => null),
    getJson('/api/orders?status=open').catch(() => null),
    getJson('/api/tokens').catch(() => null),
    getJson('/api/dex/pairs').catch(() => null),
  ]);

  // ticker may be a single object or {tickers:[...]}
  let row = ticker;
  if (ticker && Array.isArray(ticker.tickers)) {
    row = ticker.tickers.find((t) => String(t.symbol).toUpperCase() === SYMBOL) || null;
  }
  if (!row || !row.baseAssetId || !row.quoteAssetId) {
    // fallback: resolve from tokens
    const list = (tokens && tokens.tokens) || [];
    const baseTok = list.find((t) => String(t.ticker).toUpperCase() === BASE_TICKER);
    const quoteTok = list.find((t) => String(t.ticker).toUpperCase() === QUOTE_TICKER);
    if (!baseTok || !quoteTok) return null;
    row = {
      symbol: SYMBOL,
      base: BASE_TICKER,
      quote: QUOTE_TICKER,
      baseAssetId: baseTok.assetId,
      quoteAssetId: quoteTok.assetId,
      last: null,
      lastUsd: null,
      volume24hBase: null,
      volume24hQuote: null,
    };
  }

  const baseId = String(row.baseAssetId);
  const quoteId = String(row.quoteAssetId);
  const baseDec = decimalsFromTokens(tokens, BASE_TICKER, baseId, 9);
  const quoteDec = decimalsFromTokens(tokens, QUOTE_TICKER, quoteId, 8);

  const orders = (ordersPayload && ordersPayload.orders) || ordersPayload || [];
  const { asks, bids } = buildLevels(orders, baseId, quoteId, baseDec, quoteDec);

  const dex = pickDexPair(dexPairs, baseId, quoteId);
  let volume24hBase = row.volume24hBase;
  let volume24hQuote = row.volume24hQuote;
  if ((volume24hBase == null || volume24hBase === 0) && dex && dex.volumeHuman != null) {
    const v = Number(dex.volumeHuman);
    if (Number.isFinite(v)) volume24hBase = v;
  }

  return {
    symbol: row.symbol || SYMBOL,
    base: row.base || BASE_TICKER,
    quote: row.quote || QUOTE_TICKER,
    last: row.last != null ? Number(row.last) : null,
    lastUsd: row.lastUsd != null ? Number(row.lastUsd) : null,
    bid: row.bid != null ? Number(row.bid) : (bids[0] ? bids[0].price : null),
    ask: row.ask != null ? Number(row.ask) : (asks[0] ? asks[0].price : null),
    volume24hBase: volume24hBase != null ? Number(volume24hBase) : null,
    volume24hQuote: volume24hQuote != null ? Number(volume24hQuote) : null,
    asks,
    bids,
    openCount: asks.length + bids.length,
    link: 'https://trade.privacydatacoin.com',
  };
};
