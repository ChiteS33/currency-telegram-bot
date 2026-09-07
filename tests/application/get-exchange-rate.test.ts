import { describe, expect, it } from 'vitest';
import { GetExchangeRate } from '../../src/application/get-exchange-rate.js';
import type { ExchangeRateProvider } from '../../src/application/ports/exchange-rate-provider.js';
import { CurrencyCode, InvalidCurrencyCodeError } from '../../src/domain/currency-code.js';

describe('GetExchangeRate', () => {
  it('normalizes input and delegates to the provider', async () => {
    let received = '';
    const provider: ExchangeRateProvider = {
      async getUsdRate(base) {
        received = base.value;
        return { base, quote: 'USD', rate: 1.08 };
      },
    };

    const result = await new GetExchangeRate(provider).execute('eur');

    expect(received).toBe('EUR');
    expect(result.rate).toBe(1.08);
  });

  it('rejects invalid input before calling provider', async () => {
    const provider: ExchangeRateProvider = {
      getUsdRate: async () => {
        throw new Error('provider should not be called');
      },
    };

    await expect(new GetExchangeRate(provider).execute('EURO')).rejects.toBeInstanceOf(InvalidCurrencyCodeError);
  });

  it('returns one without requesting a rate for USD', async () => {
    const provider: ExchangeRateProvider = {
      getUsdRate: async () => {
        throw new Error('provider should not be called');
      },
    };

    await expect(new GetExchangeRate(provider).execute('USD')).resolves.toMatchObject({ quote: 'USD', rate: 1 });
  });

  it('propagates provider errors', async () => {
    const provider: ExchangeRateProvider = {
      getUsdRate: async () => {
        throw new Error('network down');
      },
    };

    await expect(new GetExchangeRate(provider).execute('EUR')).rejects.toThrow('network down');
  });
});
