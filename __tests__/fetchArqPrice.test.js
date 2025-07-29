const fetchArqPrice = require('../fetch/fetchArqPrice');
const axios = require('axios');

jest.mock('axios');

describe('fetchArqPrice', () => {
  it('returns correct price object', async () => {
    axios.get.mockResolvedValue({ data: { price: "0.00001", volume: "100" } });
    const result = await fetchArqPrice();
    expect(result).toEqual({ priceBtc: "0.00001000", priceSat: 1000, volumeBtc: 100 });
  });

  it('returns null on error', async () => {
    axios.get.mockRejectedValue(new Error("fail"));
    const result = await fetchArqPrice();
    expect(result).toBeNull();
  });
});