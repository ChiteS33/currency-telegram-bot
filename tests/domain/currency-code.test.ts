import { describe, expect, it } from 'vitest';
import { CurrencyCode, InvalidCurrencyCodeError } from '../../src/domain/currency-code.js';

describe('CurrencyCode', () => {
  it('normalizes a lowercase code', () => {
    expect(CurrencyCode.parse(' eur ').value).toBe('EUR');
  });

  it('accepts USD', () => {
    expect(CurrencyCode.parse('USD').value).toBe('USD');
  });

  it.each(['', 'EURO', '12A', 'E$R'])('rejects invalid code %j', (input) => {
    expect(() => CurrencyCode.parse(input)).toThrow(InvalidCurrencyCodeError);
  });
});
