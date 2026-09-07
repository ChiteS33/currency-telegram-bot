export class RateProviderError extends Error {
  public constructor(message = 'The exchange-rate provider is unavailable.') {
    super(message);
    this.name = 'RateProviderError';
  }
}
