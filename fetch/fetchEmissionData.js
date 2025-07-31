const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/emission');
        const emission = response.data && response.data.data && response.data.data.coinbase
            ? Math.floor(response.data.data.coinbase / 100_000)
            : null;
        return { emission: emission ? emission.toString().slice(0, 8) : null };
    } catch (error) {
        console.error("Error fetching emission data:", error);
        return { emission: null };
    }
};