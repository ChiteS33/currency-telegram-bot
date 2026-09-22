import type { Client, InteractionStore } from './ports/interaction-store.js';
export class GetClients { constructor(private readonly store: InteractionStore) {} execute(): Promise<Client[]> { return this.store.listClients(); } }
