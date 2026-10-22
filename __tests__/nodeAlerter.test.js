const nodeAlerter = require('../alerts/nodeAlerter');
const nodeList = [
  { name: 'Node1', url: 'http://fakeurl.com/1' }
];

jest.mock('axios');

describe('nodeAlerter', () => {
  it('sends offline and online alerts (simulate)', async () => {
    const axios = require('axios');
    // 1st call: node is offline, 2nd call: node is online and in sync
    axios.get
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: { height: 100, target_height: 100 } });

    let messages = [];
    const fakeTelegram = { sendMessage: jest.fn((id, msg) => messages.push(['tg', msg])) };
    const fakeDiscord = { channels: { cache: new Map([["cid", { send: msg => messages.push(['ds', msg]) }]]) } };

    let state = [{ offline: false, behind: false }];
    process.env.DISCORD_ALERT_CHANNEL_ID = "cid";

    // 1st: node offline
    await nodeAlerter(nodeList, state, fakeTelegram, 42, fakeDiscord);
    expect(messages.some(([type, msg]) => /OFFLINE/.test(msg))).toBeTruthy();

    // 2nd: node back online
    await nodeAlerter(nodeList, state, fakeTelegram, 42, fakeDiscord);
    expect(messages.some(([type, msg]) => /back ONLINE/.test(msg))).toBeTruthy();
  });
});