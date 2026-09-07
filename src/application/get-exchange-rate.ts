import { CurrencyCode } from '../domain/currency-code.js';
import type { ExchangeRate } from '../domain/exchange-rate.js';
import type { ExchangeRateProvider } from './ports/exchange-rate-provider.js';

export class GetExchangeRate {
  public constructor(private readonly provider: ExchangeRateProvider) {}

  public async execute(input: string): Promise<ExchangeRate> {
    const base = CurrencyCode.parse(input);

    if (base.value === 'USD') {
      return { base, quote: 'USD', rate: 1 };
    }

    return this.provider.getUsdRate(base);
  }
}
