import type { GetClients } from '../../application/get-clients.js';
import type { FastifyInstance } from 'fastify';
export async function registerClientsRoute(app: FastifyInstance, getClients: Pick<GetClients, 'execute'>): Promise<void> { app.get('/api/clients', async () => getClients.execute()); }
