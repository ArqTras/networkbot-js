const axios = require('axios');
module.exports = async () => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    return response.data && response.data.price ? parseFloat(response.data.price) : null;
  } catch { return null; }
};
