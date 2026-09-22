# Telegram message history and read API design

## Goal

Store every text message exchanged in a private Telegram chat between the user and the bot. Expose two public HTTP endpoints so a reviewer can see that the server state changes after sending a message to the bot.

## Scope

- Private chats only.
- PostgreSQL is the persistent store.
- The existing Fastify process hosts the HTTP endpoints.
- The existing Telegraf long-polling bot records incoming text messages and its successful replies.
- No Supabase, separate API service, authentication, pagination, or client/message filtering is required for this assignment.

## Architecture

The bot process remains the single deployable application:

1. Telegraf receives a text message from a private-chat user.
2. The application upserts the client and writes an `incoming` message record.
3. The current currency-conversion use case produces the reply.
4. Telegraf sends the reply to Telegram.
5. The application writes an `outgoing` message record and updates the client's last-contact time.
6. Fastify reads PostgreSQL for the two GET endpoints.

If persistence fails, the error is logged. A database error must not prevent a reply from being attempted.

## Data model

### `clients`

- `telegram_user_id BIGINT PRIMARY KEY`
- `first_name TEXT NOT NULL`
- `username TEXT NULL`
- `last_contact_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

A client is the unique Telegram user in a private chat. Every stored incoming or outgoing message updates `last_contact_at` to the later timestamp.

### `messages`

- `id BIGSERIAL PRIMARY KEY`
- `telegram_chat_id BIGINT NOT NULL`
- `telegram_message_id BIGINT NOT NULL`
- `telegram_user_id BIGINT NOT NULL REFERENCES clients(telegram_user_id)`
- `direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing'))`
- `text TEXT NOT NULL`
- `sent_at TIMESTAMPTZ NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`

`UNIQUE (telegram_chat_id, telegram_message_id)` prevents duplicate records when Telegram redelivers an update or the process restarts. An index on `clients(last_contact_at DESC)` supports the client list; an index on `messages(sent_at DESC)` supports the message list.

## HTTP contract

### `GET /api/clients`

Returns every client ordered by `lastContactAt` descending (most recent first).

### `GET /api/messages`

Returns every stored message ordered by `sentAt` descending (newest first).

The endpoints return JSON and intentionally require no query parameters or authorization, so the reviewer can call them directly during the assignment check.

## Configuration and deployment

- Add `DATABASE_URL` to `.env.example` and production environment configuration.
- Add PostgreSQL to local Docker Compose with a named volume for persistence.
- On the server, use the supplied PostgreSQL instance/database and a dedicated application role with limited privileges.
- Apply a versioned SQL migration before starting the new application version.

## Verification

Automated tests cover client upsert/contact-time updates, message deduplication, both ordering rules, and both HTTP routes. Manual acceptance test: send a private text message to the bot, then call both endpoints and confirm the new client and both inbound/outbound messages appear in the required order.
