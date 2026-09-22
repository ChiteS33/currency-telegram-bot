import type { Pool } from 'pg';
import type { Client, InteractionInput, InteractionStore, StoredMessage } from '../../application/ports/interaction-store.js';

export class PostgresInteractionStore implements InteractionStore {
  constructor(private readonly pool: Pool) {}
  async record(input: InteractionInput): Promise<void> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN');
      await client.query(`INSERT INTO clients (telegram_user_id, first_name, username, last_contact_at) VALUES ($1,$2,$3,$4)
        ON CONFLICT (telegram_user_id) DO UPDATE SET first_name=EXCLUDED.first_name, username=EXCLUDED.username,
        last_contact_at=GREATEST(clients.last_contact_at, EXCLUDED.last_contact_at), updated_at=NOW()`, [input.telegramUserId, input.firstName, input.username, input.sentAt]);
      await client.query(`INSERT INTO messages (telegram_chat_id, telegram_message_id, telegram_user_id, direction, text, sent_at)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (telegram_chat_id, telegram_message_id) DO NOTHING`, [input.chatId, input.messageId, input.telegramUserId, input.direction, input.text, input.sentAt]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async listClients(): Promise<Client[]> { const r = await this.pool.query('SELECT telegram_user_id, first_name, username, last_contact_at FROM clients ORDER BY last_contact_at DESC'); return r.rows.map((x) => ({ telegramUserId: Number(x.telegram_user_id), firstName: x.first_name, username: x.username, lastContactAt: x.last_contact_at })); }
  async listMessages(): Promise<StoredMessage[]> { const r = await this.pool.query('SELECT telegram_user_id, telegram_chat_id, telegram_message_id, first_name, username, direction, text, sent_at FROM messages JOIN clients USING (telegram_user_id) ORDER BY sent_at DESC'); return r.rows.map((x) => ({ telegramUserId: Number(x.telegram_user_id), chatId: Number(x.telegram_chat_id), messageId: Number(x.telegram_message_id), firstName: x.first_name, username: x.username, direction: x.direction, text: x.text, sentAt: x.sent_at })); }
}
