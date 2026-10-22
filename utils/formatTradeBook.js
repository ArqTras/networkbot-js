function fmtPrice(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1) return n.toFixed(6).replace(/\.?0+$/, "");
  const s = n.toFixed(10);
  return s.replace(/0+$/, "").replace(/\.$/, "") || "0";
}

function fmtAmt(n, maxFrac) {
  if (n == null || !Number.isFinite(n)) return "—";
  const frac = maxFrac == null ? 6 : maxFrac;
  let s = n.toFixed(frac);
  s = s.replace(/\.?0+$/, "");
  return s || "0";
}

function fmtUsd(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1) return "$" + n.toFixed(4);
  if (n >= 0.01) return "$" + n.toFixed(6);
  return "$" + n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function renderSide(levels, limit) {
  const rows = (levels || []).slice(0, limit);
  if (!rows.length) return "  (empty)";
  const lines = [];
  for (const lv of rows) {
    lines.push(
      "  " +
        fmtPrice(lv.price) +
        " BTCX  ·  " +
        fmtAmt(lv.baseAmount, 4) +
        " ARQX  ·  " +
        fmtAmt(lv.quoteAmount, 8) +
        " BTCX"
    );
  }
  if ((levels || []).length > limit) {
    lines.push("  … +" + ((levels || []).length - limit) + " more");
  }
  return lines.join("\n");
}

module.exports = function formatTradeBook(data) {
  if (!data) return "❌ Failed to fetch Trade data (ARQX/BTCX).";

  const lastBtcx =
    data.last != null && Number.isFinite(data.last) ? fmtPrice(data.last) + " BTCX" : "—";
  const lastUsd = fmtUsd(data.lastUsd);

  const volBase =
    data.volume24hBase != null && Number.isFinite(data.volume24hBase)
      ? fmtAmt(data.volume24hBase, 4) + " ARQX"
      : "—";
  const volQuote =
    data.volume24hQuote != null && Number.isFinite(data.volume24hQuote)
      ? fmtAmt(data.volume24hQuote, 8) + " BTCX"
      : "—";

  const bestBid = data.bid != null ? fmtPrice(data.bid) + " BTCX" : "—";
  const bestAsk = data.ask != null ? fmtPrice(data.ask) + " BTCX" : "—";
  let spread = "—";
  if (data.bid != null && data.ask != null && data.bid > 0) {
    const pct = ((data.ask - data.bid) / data.bid) * 100;
    if (Number.isFinite(pct)) spread = pct.toFixed(2) + "%";
  }

  const parts = [];
  parts.push("📈 Trade — ARQX / BTCX");
  parts.push("");
  parts.push("💰 Last:    " + lastBtcx);
  parts.push("💵 Value:   " + lastUsd);
  parts.push("🟢 Best bid: " + bestBid);
  parts.push("🔴 Best ask: " + bestAsk);
  parts.push("📐 Spread:  " + spread);
  parts.push("📦 Open:    " + (data.openCount != null ? data.openCount : 0) + " orders");
  parts.push("📊 24h vol: " + volBase + "  /  " + volQuote);
  parts.push("");
  parts.push("🔴 Asks (sell ARQX)");
  parts.push("  price · amount · total");
  parts.push(renderSide(data.asks, 8));
  parts.push("");
  parts.push("🟢 Bids (buy ARQX)");
  parts.push("  price · amount · total");
  parts.push(renderSide(data.bids, 8));
  parts.push("");
  parts.push("🔗 " + (data.link || "https://trade.privacydatacoin.com"));

  return parts.join("\n");
};
