import { Telegraf } from 'telegraf';

export function createTelegramBot(
  token: string,
  handleText: (text: string) => Promise<string>,
): Telegraf {
  const bot = new Telegraf(token);

  bot.on('text', async (context) => {
    await context.reply(await handleText(context.message.text));
  });

  bot.catch((error) => {
    console.error('Unhandled Telegram update error:', error);
  });

  return bot;
}
