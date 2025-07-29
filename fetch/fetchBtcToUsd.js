const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        return parseFloat(response.data.price);
    } catch (error) {
        console.error("Error fetching BTC-to-USD rate from Binance:", error);
        return null;
    }
};