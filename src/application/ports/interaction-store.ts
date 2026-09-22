export type MessageDirection = 'incoming' | 'outgoing';

export interface InteractionInput {
  telegramUserId: number;
  chatId: number;
  messageId: number;
  firstName: string;
  username: string | null;
  direction: MessageDirection;
  text: string;
  sentAt: Date;
}

export interface Client {
  telegramUserId: number;
  firstName: string;
  username: string | null;
  lastContactAt: Date;
}

export interface StoredMessage extends InteractionInput {}

export interface InteractionStore {
  record(input: InteractionInput): Promise<void>;
  listClients(): Promise<Client[]>;
  listMessages(): Promise<StoredMessage[]>;
}
