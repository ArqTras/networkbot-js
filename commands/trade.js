const fetchTradeBook = require('../fetch/fetchTradeBook');
const formatTradeBook = require('../utils/formatTradeBook');

module.exports = async () => {
  try {
    const data = await fetchTradeBook();
    return formatTradeBook(data);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[trade]', e.message || e);
    }
    return '❌ Nie udało się pobrać order booka ARQX/BTCX z Trade.';
  }
};
