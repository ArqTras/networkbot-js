const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
        if (!response.data || !response.data.price || !response.data.volume) return null;
        const priceBtc = parseFloat(response.data.price).toFixed(8);
        const priceSat = Math.round(priceBtc * 100_000_000);
        const volumeBtc = parseFloat(response.data.volume);
        return { priceBtc, priceSat, volumeBtc };
    } catch (error) {
        console.error("Error fetching ARQ price:", error);
        return null;
    }
};