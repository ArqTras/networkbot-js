const fetchNetworkInfo = require('../fetch/fetchNetworkInfo');
const fetchEmissionData = require('../fetch/fetchEmissionData');
const fetchArqPrice = require('../fetch/fetchArqPrice');
const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');
const fetchServiceNodeData = require('../fetch/fetchServiceNodeData');
const formatNetworkStats = require('../utils/formatNetworkStats');

module.exports = async () => {
  const [networkData, emissionData, arqPrice, btcToUsd, sn] = await Promise.all([
    fetchNetworkInfo(), fetchEmissionData(), fetchArqPrice(), fetchBtcToUsd(), fetchServiceNodeData()
  ]);
  const activeNodes = sn ? sn.activeNodes : undefined;
  const awaitingNodes = sn ? sn.awaitingNodes : undefined;

  return formatNetworkStats({
    networkData, emissionData, arqPrice, btcToUsd, activeNodes, awaitingNodes
  }) || 'Failed to fetch network data.';
};
