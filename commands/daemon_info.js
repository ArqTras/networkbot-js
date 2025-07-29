const fetchDaemonInfo = require('../fetch/fetchDaemonInfo');
module.exports = async (daemonClient) => {
  return await fetchDaemonInfo(daemonClient);
};