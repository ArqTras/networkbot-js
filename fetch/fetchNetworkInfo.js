const axios = require('axios');
module.exports = async () => {
  try {
    const response = await axios.get('https://explorer.arqma.com/api/networkinfo');
    const data = response && response.data && response.data.data;
    if (!data) return null;
    return { height: data.height, hashrate: ((data.hash_rate || 0) / 1000000).toFixed(2), difficulty: data.difficulty };
  } catch { return null; }
};
