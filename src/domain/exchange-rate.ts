import type { CurrencyCode } from './currency-code.js';

export interface ExchangeRate {
  readonly base: CurrencyCode;
  readonly quote: 'USD';
  readonly rate: number;
  readonly date?: string;
}
