import TradingView from '@mathieuc/tradingview';
import { sub } from 'date-fns';
import fs from 'fs';
import async from 'async';

const client = new TradingView.Client();

async function fetchPercentagesForCrypto(symbol) {
  const queries = [
    { symbol, subtracted: { days: 0 } },
    { symbol, subtracted: { days: 7 } },
    { symbol, subtracted: { days: 30 } },
    { symbol, subtracted: { days: 90 } },
    { symbol, subtracted: { years: 1 } },
    { symbol, subtracted: { years: 2 } },
    { symbol, subtracted: { years: 3 } },
  ].map((query) => fetchPercentage(query));
  return Promise.allSettled(queries);
}

function formatPctForCrypto(prices) {
  const pcts = prices.filter((p) => p.status === 'fulfilled');
  if (!pcts?.[0]?.value?.symbol) return;
  return {
    symbol: pcts[0].value.symbol,
    description: pcts[0].value.description,
    day_0: pcts.find((p) => p.value.subtracted.days === 0)?.value.pct || '',
    day_7: pcts.find((p) => p.value.subtracted.days === 7)?.value.pct || '',
    day_30: pcts.find((p) => p.value.subtracted.days === 30)?.value.pct || '',
    day_90: pcts.find((p) => p.value.subtracted.days === 90)?.value.pct || '',
    year_1: pcts.find((p) => p.value.subtracted.years === 1)?.value.pct || '',
    year_2: pcts.find((p) => p.value.subtracted.years === 2)?.value.pct || '',
    year_3: pcts.find((p) => p.value.subtracted.years === 3)?.value.pct || '',
    url: pcts[0].value.url,
  };
}

async function fetchPercentage(query) {
  return new Promise((resolve, reject) => {
    fetchChartData(query, resolve, reject);
  });
}

function fetchChartData({ symbol, subtracted }, resolve, reject) {
  const defaultTimeout = setTimeout(() => {
    reject({
      subtracted,
      error: `Timeout for ${JSON.stringify(subtracted)}`,
    });
  }, 2000);
  const chart = new client.Session.Chart();
  chart.onError((...err) => {
    // Listen for errors (can avoid crash)
    console.error('Chart error:', ...err);
  });
  chart.onUpdate(() => {
    clearTimeout(defaultTimeout);
    if (!chart.periods[0]) return;
    const response = {
      time: new Date(chart.periods[0].time * 1000),
      pct: chart.periods[0].close,
    };
    resolve({
      symbol,
      description: chart.infos.description,
      subtracted,
      ...response,
      url: `https://www.tradingview.com/chart/?symbol=INTOTHEBLOCK:${symbol.toUpperCase()}_WHALESPERCENTAGE`,
    });
  });
  chart.setMarket(`INTOTHEBLOCK:${symbol.toUpperCase()}_WHALESPERCENTAGE`, {
    timeframe: '1D',
    range: 1,
    to: sub(new Date(), subtracted).getTime() / 1000,
  });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  try {
    const cryptos = fs
      .readFileSync('./cryptos.txt', 'utf-8')
      .split(/\r?\n/)
      .filter(Boolean);
    console.log(`✨ Fetching data for ${cryptos.length} cryptos...`);
    let i = 0;
    console.time('Fetching cryptos');
    async.mapLimit(
      cryptos,
      2,
      async (crypto) => {
        console.timeLog('Fetching cryptos', ++i);
        const result = await fetchPercentagesForCrypto(crypto);
        await delay(1000);
        return formatPctForCrypto(result);
      },
      (err, results) => {
        if (err) throw err;
        // results is now an array of the response bodies
        fs.writeFileSync('./whales.json', JSON.stringify(results, null, 2));
        console.log(`🚀 File whales.json generated for ${cryptos.length} cryptos!`);
        console.timeEnd('Fetching cryptos');
        process.exit();
      }
    );
  } catch (error) {
    console.error('Error fetching percentages for crypto:', error);
  } finally {
    client.end();
  }
})();
