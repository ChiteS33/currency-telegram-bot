export class InvalidCurrencyCodeError extends Error {
  public constructor() {
    super('Currency code must contain exactly three Latin letters.');
    this.name = 'InvalidCurrencyCodeError';
  }
}

export class CurrencyCode {
  private constructor(public readonly value: string) {}

  public static parse(input: string): CurrencyCode {
    const normalized = input.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new InvalidCurrencyCodeError();
    }

    return new CurrencyCode(normalized);
  }
}
