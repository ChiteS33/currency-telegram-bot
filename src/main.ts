import 'dotenv/config';
import { GetExchangeRate } from './application/get-exchange-rate.js';
import { buildApp } from './app.js';
import { FrankfurterExchangeRateProvider } from './infrastructure/frankfurter-exchange-rate-provider.js';
import { createCurrencyMessageHandler } from './presentation/telegram/currency-message-handler.js';
import { createTelegramBot } from './presentation/telegram/create-telegram-bot.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'replace_with_token_from_botfather') {
  console.error('TELEGRAM_BOT_TOKEN is required. Copy .env.example to .env and set your token.');
  process.exit(1);
}

const requestedPort = Number(process.env.PORT ?? 3000);
const app = await buildApp();
const useCase = new GetExchangeRate(new FrankfurterExchangeRateProvider());
const bot = createTelegramBot(token, createCurrencyMessageHandler(useCase));

try {
  await app.listen({ port: requestedPort, host: '0.0.0.0' });
} catch (error: unknown) {
  if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') {
    throw error;
  }

  app.log.warn(`Port ${requestedPort} is busy; using a free port instead.`);
  await app.listen({ port: 0, host: '0.0.0.0' });
}

await bot.launch();
app.log.info(`Telegram bot is running with long polling; health check: /health`);

async function stop(signal: string): Promise<void> {
  app.log.info(`Received ${signal}, stopping application.`);
  bot.stop(signal);
  await app.close();
}

process.once('SIGINT', () => void stop('SIGINT'));
process.once('SIGTERM', () => void stop('SIGTERM'));
