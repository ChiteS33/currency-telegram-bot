import { RateProviderError } from '../application/errors.js';
import type { ExchangeRateProvider } from '../application/ports/exchange-rate-provider.js';
import type { CurrencyCode } from '../domain/currency-code.js';
import type { ExchangeRate } from '../domain/exchange-rate.js';

interface FrankfurterPayload {
  date?: unknown;
  rates?: { USD?: unknown };
}

export class FrankfurterExchangeRateProvider implements ExchangeRateProvider {
  private readonly endpoint = 'https://api.frankfurter.dev/v1/latest';

  public constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  public async getUsdRate(base: CurrencyCode): Promise<ExchangeRate> {
    try {
      const url = `${this.endpoint}?base=${encodeURIComponent(base.value)}&symbols=USD`;
      const response = await this.fetchImpl(url);

      if (!response.ok) {
        throw new RateProviderError();
      }

      const payload = (await response.json()) as FrankfurterPayload;
      const rate = payload.rates?.USD;

      if (typeof rate !== 'number' || !Number.isFinite(rate)) {
        throw new RateProviderError('The exchange-rate response has no USD rate.');
      }

      return {
        base,
        quote: 'USD',
        rate,
        ...(typeof payload.date === 'string' ? { date: payload.date } : {}),
      };
    } catch (error) {
      if (error instanceof RateProviderError) {
        throw error;
      }

      throw new RateProviderError();
    }
  }
}
