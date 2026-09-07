import { describe, expect, it } from 'vitest';
import { RateProviderError } from '../../../src/application/errors.js';
import type { GetExchangeRate } from '../../../src/application/get-exchange-rate.js';
import { CurrencyCode, InvalidCurrencyCodeError } from '../../../src/domain/currency-code.js';
import { createCurrencyMessageHandler } from '../../../src/presentation/telegram/currency-message-handler.js';

describe('currency message handler', () => {
  it('formats an exchange rate and date', async () => {
    const useCase: Pick<GetExchangeRate, 'execute'> = {
      execute: async () => ({ base: CurrencyCode.parse('EUR'), quote: 'USD', rate: 1.08, date: '2026-01-02' }),
    };

    await expect(createCurrencyMessageHandler(useCase)('eur')).resolves.toBe('1 EUR = 1.08 USD (2026-01-02)');
  });

  it('guides the user after invalid input', async () => {
    const useCase: Pick<GetExchangeRate, 'execute'> = {
      execute: async () => { throw new InvalidCurrencyCodeError(); },
    };

    await expect(createCurrencyMessageHandler(useCase)('EURO')).resolves.toContain('EUR');
  });

  it('hides provider details from the user', async () => {
    const useCase: Pick<GetExchangeRate, 'execute'> = {
      execute: async () => { throw new RateProviderError('secret internal detail'); },
    };

    const message = await createCurrencyMessageHandler(useCase)('EUR');
    expect(message).toContain('временно недоступен');
    expect(message).not.toContain('secret internal detail');
  });
});
