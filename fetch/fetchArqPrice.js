const axios = require('axios');
module.exports = async () => {
  try {
    const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
    if (!response.data || !response.data.price) return null;
    const priceBtc = parseFloat(response.data.price).toFixed(8);
    const priceSat = Math.round(parseFloat(response.data.price) * 100000000);
    const volumeBtc = parseFloat(response.data.volume || 0);
    return { priceBtc, priceSat, volumeBtc };
  } catch { return null; }
};
