const fetchArqPrice = require('../fetch/fetchArqPrice');
const axios = require('axios');

jest.mock('axios');

describe('fetchArqPrice', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('returns price from Trade ARQX-BTCX ticker', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        tickers: [
          {
            symbol: 'ARQX-BTCX',
            last: 3e-8,
            lastUsd: 0.002437635,
          },
        ],
      },
    });
    const result = await fetchArqPrice();
    expect(result).toEqual({
      priceBtc: '0.00000003',
      priceSat: 3,
      priceUsd: 0.002437635,
    });
  });

  it('falls back to TradeOgre when Trade fails', async () => {
    axios.get
      .mockRejectedValueOnce(new Error('trade down'))
      .mockRejectedValueOnce(new Error('api trade down'))
      .mockResolvedValueOnce({ data: { price: '0.00001', volume: '100' } });
    const result = await fetchArqPrice();
    expect(result).toEqual({
      priceBtc: '0.00001000',
      priceSat: 1000,
      priceUsd: null,
    });
  });

  it('returns null on error', async () => {
    axios.get.mockRejectedValue(new Error('fail'));
    const result = await fetchArqPrice();
    expect(result).toBeNull();
  });
});
