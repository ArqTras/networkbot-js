const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/networkinfo');
        const data = response.data.data;
        if (!data) return null;
        return {
            height: data.height,
            hashrate: (data.hash_rate / 1_000_000).toFixed(2),
            difficulty: data.difficulty
        };
    } catch (error) {
        console.error("Error fetching network info:", error);
        return null;
    }
};