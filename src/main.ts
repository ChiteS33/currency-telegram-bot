import 'dotenv/config';
import { Pool } from 'pg';
import { GetClients } from './application/get-clients.js';
import { GetExchangeRate } from './application/get-exchange-rate.js';
import { GetMessages } from './application/get-messages.js';
import { RecordTelegramInteraction } from './application/record-telegram-interaction.js';
import { buildApp } from './app.js';
import { FrankfurterExchangeRateProvider } from './infrastructure/frankfurter-exchange-rate-provider.js';
import { PostgresInteractionStore } from './infrastructure/postgres/postgres-interaction-store.js';
import { runMigrations } from './infrastructure/postgres/run-migrations.js';
import { createCurrencyMessageHandler } from './presentation/telegram/currency-message-handler.js';
import { createTelegramBot } from './presentation/telegram/create-telegram-bot.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

if (!token || token === 'replace_with_token_from_botfather') {
  console.error('TELEGRAM_BOT_TOKEN is required. Copy .env.example to .env and set your token.');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Set it in .env before starting the application.');
  process.exit(1);
}

const requestedPort = Number(process.env.PORT ?? 3000);
const pool = new Pool({ connectionString: databaseUrl });
await runMigrations(pool);
const interactionStore = new PostgresInteractionStore(pool);
const recordInteraction = new RecordTelegramInteraction(interactionStore);
const app = await buildApp({
  getClients: new GetClients(interactionStore),
  getMessages: new GetMessages(interactionStore),
});
const useCase = new GetExchangeRate(new FrankfurterExchangeRateProvider());
const bot = createTelegramBot(token, createCurrencyMessageHandler(useCase), recordInteraction);

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
  await pool.end();
}

process.once('SIGINT', () => void stop('SIGINT'));
process.once('SIGTERM', () => void stop('SIGTERM'));
