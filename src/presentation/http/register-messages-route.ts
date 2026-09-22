import type { GetMessages } from '../../application/get-messages.js';
import type { FastifyInstance } from 'fastify';
export async function registerMessagesRoute(app: FastifyInstance, getMessages: Pick<GetMessages, 'execute'>): Promise<void> { app.get('/api/messages', async () => getMessages.execute()); }
