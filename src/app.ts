import Fastify, { type FastifyInstance } from 'fastify';
import { registerHealthRoute } from './presentation/http/register-health-route.js';

export async function buildApp(options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });
  await registerHealthRoute(app);
  return app;
}
