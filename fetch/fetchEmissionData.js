const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/emission');
        const emission = Math.floor(response.data.data.coinbase / 100_000);
        return { emission: emission.toString().slice(0, 8) };
    } catch (error) {
        console.error("Error fetching emission data:", error);
        return null;
    }
};