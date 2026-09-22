import type { Pool } from 'pg';

export async function runMigrations(pool: Pick<Pool, 'query'>): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      telegram_user_id BIGINT PRIMARY KEY, first_name TEXT NOT NULL, username TEXT,
      last_contact_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY, telegram_chat_id BIGINT NOT NULL, telegram_message_id BIGINT NOT NULL,
      telegram_user_id BIGINT NOT NULL REFERENCES clients(telegram_user_id),
      direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')), text TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (telegram_chat_id, telegram_message_id)
    );
    CREATE INDEX IF NOT EXISTS clients_last_contact_at_desc_idx ON clients (last_contact_at DESC);
    CREATE INDEX IF NOT EXISTS messages_sent_at_desc_idx ON messages (sent_at DESC);
  `);
}
