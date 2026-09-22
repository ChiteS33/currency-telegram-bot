import type { InteractionInput, InteractionStore } from './ports/interaction-store.js';

export class RecordTelegramInteraction {
  constructor(private readonly store: InteractionStore) {}
  execute(input: InteractionInput): Promise<void> { return this.store.record(input); }
}
