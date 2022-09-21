const TradingView = require('@mathieuc/tradingview');
var sub = require('date-fns/sub');

const client = new TradingView.Client();

async function fetchPrices(symbol) {
  const subs = [
    { days: 0 },
    { days: 7 },
    { days: 30 },
    { days: 90 },
    { years: 1 },
    { years: 2 },
    { years: 3 },
  ]//.map((sub) => getPrice(symbol, sub));
  //return Promise.all(subs);
  
  const prices = [];
  for (const sub of subs) {
    const price = await getPrice(symbol, sub);
    prices.push(price);
  }
  return prices;
}

(async () => {
    const prices = await fetchPrices('GHST');
console.log(prices)
})();

  const timer = setTimeout(() => {fetchPrices('GHST')}, 1000000)
  

async function getPrice(symbol, subtracted) {
  console.log(symbol, subtracted);
  return new Promise((resolve, reject) => {
    try {
      const chart = new client.Session.Chart();
      chart.setMarket(`INTOTHEBLOCK:${symbol.toUpperCase()}_WHALESPERCENTAGE`, {
        timeframe: '1D',
        range: 1, // Can be positive to get before or negative to get after
        to: sub(new Date(), subtracted).getTime() / 1000,
      });
      chart.onUpdate(() => {
        const response = chart.periods.map((p) => ({
          symbol: 'GHST',
          time: new Date(p.time * 1000),
          close: p.close,
        }));
        console.log('======', subtracted, response);
        resolve(
          response
        );
        client.end();
      });
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}
