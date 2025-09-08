const axios = require('axios');
const cheerio = require('cheerio');
module.exports = async () => {
  try {
    const response = await axios.get('https://explorer.arqma.com/service_nodes');
    const $ = cheerio.load(response.data || '');
    const activeNodesText = $('body > div:nth-child(3) > h2:nth-child(4)').text().trim();
    const activeNodes = parseInt((activeNodesText || '').replace(/\D/g, ''), 10) || 0;
    const awaitingNodesText = $('#service-nodes-awaiting > span:nth-child(1)').text().trim();
    const awaitingNodes = parseInt((awaitingNodesText || '').replace(/\D/g, ''), 10) || 0;
    return { activeNodes, awaitingNodes };
  } catch { return { activeNodes: 0, awaitingNodes: 0 }; }
};
