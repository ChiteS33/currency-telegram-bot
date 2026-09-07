import type { CurrencyCode } from '../../domain/currency-code.js';
import type { ExchangeRate } from '../../domain/exchange-rate.js';

export interface ExchangeRateProvider {
  getUsdRate(base: CurrencyCode): Promise<ExchangeRate>;
}
