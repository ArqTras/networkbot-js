const fetchNetworkInfo = require('../fetch/fetchNetworkInfo');
const fetchEmissionData = require('../fetch/fetchEmissionData');
const fetchArqPrice = require('../fetch/fetchArqPrice');
const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');
const fetchServiceNodeData = require('../fetch/fetchServiceNodeData');
const formatNetworkStats = require('../utils/formatNetworkStats');

module.exports = async () => {
  const networkData = await fetchNetworkInfo();
  const emissionData = await fetchEmissionData();
  const arqPrice = await fetchArqPrice();
  const btcToUsd = await fetchBtcToUsd();
  const { activeNodes, awaitingNodes } = await fetchServiceNodeData();

  return formatNetworkStats({
      networkData,
      emissionData,
      arqPrice,
      btcToUsd,
      activeNodes,
      awaitingNodes
  }) || "Failed to fetch network data.";
};