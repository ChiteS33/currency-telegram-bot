import type { FastifyInstance } from 'fastify';

export async function registerHomeworkRoute(app: FastifyInstance): Promise<void> {
  app.get('/homework', async () => ({
    message: 'hello, it-incubator',
    studentId: 5462,
  }));
}
