const nodes = require('../commands/nodes');
const axios = require('axios');
const nodeList = require('../config/nodeList');

jest.mock('axios');

describe('nodes command', () => {
  it('shows online, syncing, and offline', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { height: 100, target_height: 102 } }) // syncing
      .mockResolvedValueOnce({ data: { height: 105 } }) // fully synced
      .mockRejectedValueOnce(new Error("fail")) // offline
      .mockResolvedValueOnce({ data: { height: 110, target_height: 110 } }); // fully synced

    const result = await nodes();
    expect(result).toMatch(/Node1 : ✅ ONLINE/);
    expect(result).toMatch(/SYNCING|FULLY SYNCED/);
    expect(result).toMatch(/Node3 : ❌ OFFLINE/);
  });
});