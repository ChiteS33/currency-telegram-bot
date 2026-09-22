import { Telegraf } from 'telegraf';
import type { RecordTelegramInteraction } from '../../application/record-telegram-interaction.js';

type InteractionRecorder = Pick<RecordTelegramInteraction, 'execute'>;
type LogError = (error: unknown) => void;

async function recordSafely(
  recorder: InteractionRecorder,
  input: Parameters<InteractionRecorder['execute']>[0],
  logError: LogError,
): Promise<void> {
  try {
    await recorder.execute(input);
  } catch (error) {
    logError(error);
  }
}

export function createTextUpdateHandler(
  handleText: (text: string) => Promise<string>,
  recorder: InteractionRecorder,
  logError: LogError = (error) => console.error('Could not persist Telegram interaction:', error),
) {
  return async (context: any): Promise<void> => {
    if (context.chat?.type !== 'private' || !context.from || !context.message?.text) return;

    const incoming = context.message;
    const sender = context.from;
    const client = {
      telegramUserId: sender.id,
      chatId: context.chat.id,
      firstName: sender.first_name,
      username: sender.username ?? null,
    };

    await recordSafely(recorder, {
      ...client,
      messageId: incoming.message_id,
      direction: 'incoming',
      text: incoming.text,
      sentAt: new Date(incoming.date * 1000),
    }, logError);

    const replyText = await handleText(incoming.text);
    const reply = await context.reply(replyText);
    await recordSafely(recorder, {
      ...client,
      messageId: reply.message_id,
      direction: 'outgoing',
      text: replyText,
      sentAt: new Date(reply.date * 1000),
    }, logError);
  };
}

export function createTelegramBot(
  token: string,
  handleText: (text: string) => Promise<string>,
  recorder: InteractionRecorder,
): Telegraf {
  const bot = new Telegraf(token);

  bot.on('text', createTextUpdateHandler(handleText, recorder));

  bot.catch((error) => {
    console.error('Unhandled Telegram update error:', error);
  });

  return bot;
}
