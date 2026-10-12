// Vercel Serverless Function: proxy ke Yahoo Finance (menghindari blokir CORS di browser)
module.exports = async (req, res) => {
  const syms = String(req.query.s || "").split(",").map(x => x.trim().toUpperCase())
    .filter(x => /^[A-Z0-9]{3,6}$/.test(x)).slice(0, 15);
  const p1 = 1420070400, p2 = Math.floor(Date.now() / 1000);
  const one = async (s) => {
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s}.JK?period1=${p1}&period2=${p2}&interval=1d&events=div%2Csplits`,
          { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" } });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json(), x = j.chart && j.chart.result && j.chart.result[0];
        if (!x || !x.timestamp) return [s, null];
        const q = x.indicators.quote[0], ac = x.indicators.adjclose && x.indicators.adjclose[0] && x.indicators.adjclose[0].adjclose;
        return [s, { t: x.timestamp, o: q.open, h: q.high, l: q.low, c: q.close, a: ac || null,
                     m: x.meta && x.meta.regularMarketPrice, mt: x.meta && x.meta.regularMarketTime }];
      } catch (e) { await new Promise(r => setTimeout(r, 600 * (a + 1))); }
    }
    return [s, null];
  };
  const out = Object.fromEntries(await Promise.all(syms.map(one)));
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  res.status(200).json({ source: "Yahoo Finance", asof: new Date().toISOString(), data: out });
};
