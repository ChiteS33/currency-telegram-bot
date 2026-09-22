import type { InteractionStore, StoredMessage } from './ports/interaction-store.js';
export class GetMessages { constructor(private readonly store: InteractionStore) {} execute(): Promise<StoredMessage[]> { return this.store.listMessages(); } }
