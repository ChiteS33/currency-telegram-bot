import { describe, expect, it, vi } from 'vitest';
import { createTextUpdateHandler } from '../../../src/presentation/telegram/create-telegram-bot.js';

describe('Telegram text update handler', () => {
  it('records a private incoming message and the sent reply', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue({ message_id: 12, date: 1_758_579_201 });
    const handler = createTextUpdateHandler(async () => '1 EUR = 1.08 USD', { execute });

    await handler({
      chat: { id: 7, type: 'private' },
      from: { id: 7, first_name: 'Ann', username: 'ann' },
      message: { message_id: 11, date: 1_758_579_200, text: 'EUR' },
      reply,
    });

    expect(execute).toHaveBeenNthCalledWith(1, expect.objectContaining({ direction: 'incoming', text: 'EUR', messageId: 11 }));
    expect(reply).toHaveBeenCalledWith('1 EUR = 1.08 USD');
    expect(execute).toHaveBeenNthCalledWith(2, expect.objectContaining({ direction: 'outgoing', text: '1 EUR = 1.08 USD', messageId: 12 }));
  });

  it('ignores group messages', async () => {
    const execute = vi.fn();
    const reply = vi.fn();
    const handler = createTextUpdateHandler(async () => 'reply', { execute });

    await handler({
      chat: { id: -100, type: 'group' },
      from: { id: 7, first_name: 'Ann' },
      message: { message_id: 11, date: 1_758_579_200, text: 'EUR' },
      reply,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });
});
