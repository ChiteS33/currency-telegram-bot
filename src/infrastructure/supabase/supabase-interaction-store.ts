import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Client, InteractionInput, InteractionStore, StoredMessage } from '../../application/ports/interaction-store.js';

export class SupabaseInteractionStore implements InteractionStore {
  private readonly client: SupabaseClient;
  constructor(url: string, serviceRoleKey: string) { this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } }); }
  async record(input: InteractionInput): Promise<void> {
    const { error } = await this.client.rpc('record_telegram_interaction', {
      p_telegram_user_id: input.telegramUserId, p_chat_id: input.chatId, p_message_id: input.messageId,
      p_first_name: input.firstName, p_username: input.username, p_direction: input.direction,
      p_text: input.text, p_sent_at: input.sentAt.toISOString(),
    });
    if (error) throw error;
  }
  async listClients(): Promise<Client[]> {
    const { data, error } = await this.client.from('clients').select('telegram_user_id, first_name, username, last_contact_at').order('last_contact_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({ telegramUserId: Number(row.telegram_user_id), firstName: row.first_name, username: row.username, lastContactAt: new Date(row.last_contact_at) }));
  }
  async listMessages(): Promise<StoredMessage[]> {
    const { data, error } = await this.client.from('messages').select('telegram_user_id, telegram_chat_id, telegram_message_id, direction, text, sent_at, clients!inner(first_name, username)').order('sent_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const client = row.clients as unknown as { first_name: string; username: string | null };
      return {
        telegramUserId: Number(row.telegram_user_id), chatId: Number(row.telegram_chat_id), messageId: Number(row.telegram_message_id),
        firstName: client.first_name, username: client.username, direction: row.direction, text: row.text, sentAt: new Date(row.sent_at),
      };
    });
  }
}
