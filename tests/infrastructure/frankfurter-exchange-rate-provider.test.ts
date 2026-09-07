import { describe, expect, it, vi } from 'vitest';
import { RateProviderError } from '../../src/application/errors.js';
import { CurrencyCode } from '../../src/domain/currency-code.js';
import { FrankfurterExchangeRateProvider } from '../../src/infrastructure/frankfurter-exchange-rate-provider.js';

const okResponse = (body: unknown): Response =>
  ({ ok: true, json: vi.fn().mockResolvedValue(body) }) as unknown as Response;

describe('FrankfurterExchangeRateProvider', () => {
  it('requests and maps the USD rate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ date: '2026-01-02', rates: { USD: 1.08 } }));
    const provider = new FrankfurterExchangeRateProvider(fetchMock as typeof fetch);

    const result = await provider.getUsdRate(CurrencyCode.parse('EUR'));

    expect(fetchMock).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD');
    expect(result).toMatchObject({ quote: 'USD', rate: 1.08, date: '2026-01-02' });
  });

  it.each(['http failure', 'network failure', 'missing USD rate'])('maps %s to RateProviderError', async (kind) => {
    const fetchMock = vi.fn();
    if (kind === 'http failure') {
      fetchMock.mockResolvedValue({ ok: false } as Response);
    } else if (kind === 'network failure') {
      fetchMock.mockRejectedValue(new Error('offline'));
    } else {
      fetchMock.mockResolvedValue(okResponse({ rates: {} }));
    }

    const provider = new FrankfurterExchangeRateProvider(fetchMock as typeof fetch);

    await expect(provider.getUsdRate(CurrencyCode.parse('EUR'))).rejects.toBeInstanceOf(RateProviderError);
  });
});
