import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/app.js';

describe('history routes', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app?.close();
  });

  it('returns clients from the injected use case', async () => {
    app = await buildApp({
      logger: false,
      getClients: { execute: async () => [{ telegramUserId: 7, firstName: 'Ann', username: null, lastContactAt: new Date('2026-09-22T10:00:00Z') }] },
      getMessages: { execute: async () => [] },
    });

    const response = await app.inject({ method: 'GET', url: '/api/clients' });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toMatchObject({ telegramUserId: 7, firstName: 'Ann' });
  });

  it('returns messages from the injected use case', async () => {
    app = await buildApp({
      logger: false,
      getClients: { execute: async () => [] },
      getMessages: { execute: async () => [{ telegramUserId: 7, chatId: 7, messageId: 12, firstName: 'Ann', username: null, direction: 'outgoing', text: 'reply', sentAt: new Date('2026-09-22T10:00:01Z') }] },
    });

    const response = await app.inject({ method: 'GET', url: '/api/messages' });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toMatchObject({ direction: 'outgoing', text: 'reply' });
  });
});
