const formatNetworkStats = require('../utils/formatNetworkStats');

describe('formatNetworkStats', () => {
  it('should return null if required fields missing', () => {
    expect(formatNetworkStats({})).toBeNull();
    expect(formatNetworkStats({networkData: {}})).toBeNull();
  });

  it('should render message with arqPrice', () => {
    const result = formatNetworkStats({
      networkData: {height: 1234, hashrate: 0.45, difficulty: 12345},
      emissionData: {emission: '1000000'},
      arqPrice: {priceBtc: '0.00001234', priceSat: 1234, volumeBtc: 10},
      btcToUsd: 60000,
      activeNodes: 12,
      awaitingNodes: 2
    });
    expect(result).toMatch(/\*\*Network Height\*\*: 1234/);
    expect(result).toMatch(/\*\*TO Price\*\*: 0\.00001234 BTC/);
    expect(result).toMatch(/\*\*BTC Price\*\*: \$60000/);
    expect(result).toMatch(/\*\*Active Service Nodes\*\*: 12/);
    expect(result).not.toMatch(/Data unavailable/);
  });

  it('should handle missing arqPrice gracefully', () => {
    const result = formatNetworkStats({
      networkData: {height: 1000, hashrate: 0.22, difficulty: 11111},
      emissionData: {emission: '888888'},
      arqPrice: null,
      btcToUsd: 50000,
      activeNodes: 5,
      awaitingNodes: 1
    });
    expect(result).toMatch(/\*\*TO Price\*\*: _Data unavailable_/);
    expect(result).toMatch(/\*\*TO 24h Volume\*\*: _Data unavailable_/);
  });
});