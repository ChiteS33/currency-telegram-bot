import Fastify, { type FastifyInstance } from 'fastify';
import type { GetClients } from './application/get-clients.js';
import type { GetMessages } from './application/get-messages.js';
import { registerHealthRoute } from './presentation/http/register-health-route.js';
import { registerHomeworkRoute } from './presentation/http/register-homework-route.js';
import { registerClientsRoute } from './presentation/http/register-clients-route.js';
import { registerMessagesRoute } from './presentation/http/register-messages-route.js';

export interface BuildAppOptions {
  logger?: boolean;
  getClients?: Pick<GetClients, 'execute'>;
  getMessages?: Pick<GetMessages, 'execute'>;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });
  await registerHealthRoute(app);
  await registerHomeworkRoute(app);
  if (options.getClients) await registerClientsRoute(app, options.getClients);
  if (options.getMessages) await registerMessagesRoute(app, options.getMessages);
  return app;
}
