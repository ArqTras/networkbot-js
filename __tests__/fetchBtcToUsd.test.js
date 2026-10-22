const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');
const axios = require('axios');

jest.mock('axios');

describe('fetchBtcToUsd', () => {
  it('should return parsed price', async () => {
    axios.get.mockResolvedValue({ data: { price: "59999.99" } });
    const result = await fetchBtcToUsd();
    expect(result).toBeCloseTo(59999.99);
  });

  it('should return null on error', async () => {
    axios.get.mockRejectedValue(new Error("fail"));
    const result = await fetchBtcToUsd();
    expect(result).toBeNull();
  });
});