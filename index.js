const TradingView = require('@mathieuc/tradingview');
const { sub } = require('date-fns');
const fs = require('fs');
const async = require('async');
const { block } = require('./block.js')

/**
 * Instantiate a new Trading View client and fetch the whales percentages for the given symbol.
 * @param symbol Symbol to fetch
 */
async function fetchPercentagesForCrypto(symbol) {
  const client = new TradingView.Client();
  const queries = [
    { symbol, subtracted: { days: 0 } },
    { symbol, subtracted: { days: 7 } },
    { symbol, subtracted: { days: 30 } },
    { symbol, subtracted: { days: 90 } },
    { symbol, subtracted: { years: 1 } },
    { symbol, subtracted: { years: 2 } },
    { symbol, subtracted: { years: 3 } },
  ].map((query) => fetchPercentage(query, client));
  const pcts = await Promise.allSettled(queries);
  client.end();
  return pcts;
}

/**
 * Format the percentages for a given result.
 * Only the results which are resolved successfully are formatted.
 * @param  {} result
 */
function formatPctForCrypto(result) {
  const pcts = result.filter((p) => p.status === 'fulfilled');
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

/**
 * Wrap the function fetchChartData in a promise.
 * @param  {} query
 * @param  {} client
 */
async function fetchPercentage(query, client) {
  return new Promise((resolve, reject) => {
    fetchChartData(query, client, resolve, reject);
  });
}

/**
 * Fetch the data for a given symbol and given date.
 * @param  {} {symbol
 * @param  {} subtracted}
 * @param  {} client
 * @param  {} resolve
 * @param  {} reject
 */
function fetchChartData({ symbol, subtracted }, client, resolve, reject) {
  const defaultTimeout = setTimeout(() => {
    reject({
      subtracted,
      error: `Timeout for ${JSON.stringify(subtracted)}`,
    });
  }, 5000);
  const chart = new client.Session.Chart();
  chart.onError((...err) => {
    // Listen for errors (can avoid crash)
    console.error('Chart error:', symbol, ...err);
    fs.appendFileSync('./invalid-cryptos.txt', `${symbol} ${err}\r\n`);
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
    chart.close;
  });
  chart.setMarket(`INTOTHEBLOCK:${symbol.toUpperCase()}_WHALESPERCENTAGE`, {
    timeframe: '1D',
    range: 1,
    to: sub(new Date(), subtracted).getTime() / 1000,
  });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Main function.
 * Will fetch the given cryptos corresponding to the file cryptos.txt.
 * Create a whales.json file and a invalid-cryptos.txt file.
 * See README for details.
 */
(async () => {
  try {
    fs.truncateSync('./invalid-cryptos.txt', 0);
    const cryptos = fs
      .readFileSync('./cryptos.txt', 'utf-8')
      .split(/\r?\n/)
      .filter(Boolean);
    console.log(`✨ Fetching data for ${cryptos.length} cryptos...`);
    let i = 0;
    console.time('Fetching cryptos');
    async.mapLimit(
      cryptos,
      5, // Do not raise this number as it leads to rate limit errors
      async (crypto) => {
        const result = await fetchPercentagesForCrypto(crypto);
        // await delay(2000); // If need be, delay can help staying under the rate limit
        const formattedResult = formatPctForCrypto(result);
        console.timeLog('Fetching cryptos', ++i, crypto);
        return formattedResult;
      },
      (err, results) => {
        if (err) throw err;
        fs.writeFileSync('./whales.json', JSON.stringify(results, null, 2));
        console.log(`🚀 File whales.json generated for ${cryptos.length} cryptos!`);
        console.timeEnd('Fetching cryptos');
        process.exit();
      }
    );
  } catch (error) {
    console.error('Error fetching percentages for crypto:', error);
  }
})();
