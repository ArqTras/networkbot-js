const axios = require('axios');
module.exports = async () => {
  try {
    const response = await axios.get('https://explorer.arqma.com/api/emission');
    const val = response && response.data && response.data.data && response.data.data.coinbase;
    if (typeof val !== 'number') return null;
    const emission = Math.floor(val / 100000);
    return { emission: emission.toString().slice(0, 8) };
  } catch { return null; }
};
