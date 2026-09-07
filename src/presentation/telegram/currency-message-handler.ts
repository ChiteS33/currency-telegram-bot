import { RateProviderError } from '../../application/errors.js';
import type { GetExchangeRate } from '../../application/get-exchange-rate.js';
import { InvalidCurrencyCodeError } from '../../domain/currency-code.js';

type ExchangeRateLookup = Pick<GetExchangeRate, 'execute'>;

export function createCurrencyMessageHandler(useCase: ExchangeRateLookup) {
  return async (text: string): Promise<string> => {
    try {
      const result = await useCase.execute(text);
      const date = result.date ? ` (${result.date})` : '';
      return `1 ${result.base.value} = ${result.rate} USD${date}`;
    } catch (error) {
      if (error instanceof InvalidCurrencyCodeError) {
        return 'Отправьте трёхбуквенный код валюты, например: EUR';
      }

      if (error instanceof RateProviderError) {
        return 'Сервис курсов временно недоступен. Попробуйте ещё раз позже.';
      }

      return 'Не удалось обработать запрос. Попробуйте ещё раз позже.';
    }
  };
}
