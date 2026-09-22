# Telegram Message History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** Store all private-chat text messages between a Telegram user and the bot in PostgreSQL and provide client/message read endpoints.

**Architecture:** The existing Telegraf handler delegates records to an application port. A PostgreSQL adapter owns migrations, client upserts, deduplication and ordered reads. Existing Fastify hosts both public routes.

**Tech Stack:** TypeScript, Node.js, Telegraf, Fastify, PostgreSQL, pg, Docker Compose, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-22-telegram-message-history-design.md`

## Global Constraints

- Private chats only.
- Record incoming text and the bot's successfully sent text reply.
- `GET /api/clients`: all clients, last contact descending.
- `GET /api/messages`: all messages, sent time descending.
- JSON endpoints must need no authentication, query parameter, filter, or pagination.
- Log persistence errors; still attempt reply delivery.
- No Supabase or separate service.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `src/application/ports/interaction-store.ts` | Data types and persistence/read port. |
| `src/application/{record-telegram-interaction,get-clients,get-messages}.ts` | Framework-independent use cases. |
| `src/infrastructure/postgres/{run-migrations,postgres-interaction-store}.ts` | Schema initialization and pg adapter. |
| `src/presentation/http/register-{clients,messages}-route.ts` | Fastify endpoints. |
| `src/presentation/telegram/create-telegram-bot.ts` | Private chat records around reply delivery. |
| `src/{app,main}.ts` | Dependency injection and lifecycle. |
| `compose.yml`, `.env.example`, `package.json`, `README.md` | Runtime configuration and docs. |

### Task 1: Add database configuration and migration

**Files:**
- Modify: `package.json`, `.env.example`, `compose.yml`
- Create: `src/infrastructure/postgres/run-migrations.ts`
- Test: `tests/infrastructure/postgres/run-migrations.test.ts`

**Interfaces:**
- Produces: `runMigrations(pool: Pick<Pool, 'query'>): Promise<void>`.

- [ ] **Step 1: Write failing test**

```ts
import { expect, it, vi } from 'vitest';
import { runMigrations } from '../../../src/infrastructure/postgres/run-migrations.js';

it('creates the interaction tables and indexes', async () => {
  const query = vi.fn().mockResolvedValue({});
  await runMigrations({ query });
  const sql = query.mock.calls[0][0] as string;
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS clients');
  expect(sql).toContain('UNIQUE (telegram_chat_id, telegram_message_id)');
  expect(sql).toContain('messages_sent_at_desc_idx');
});
```

- [ ] **Step 2: Prove failure**

Run: `npm test -- tests/infrastructure/postgres/run-migrations.test.ts`

Expected: FAIL; module absent.

- [ ] **Step 3: Add runtime configuration**

Run: `npm install pg && npm install --save-dev @types/pg`.

Add `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` to `.env.example`. Add a `postgres:16-alpine` Compose service with named `postgres_data` volume and `pg_isready` healthcheck. Make `bot` wait for the database healthcheck.

- [ ] **Step 4: Implement migration**

Execute idempotent SQL creating:

```sql
CREATE TABLE IF NOT EXISTS clients (
  telegram_user_id BIGINT PRIMARY KEY, first_name TEXT NOT NULL, username TEXT,
  last_contact_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY, telegram_chat_id BIGINT NOT NULL,
  telegram_message_id BIGINT NOT NULL,
  telegram_user_id BIGINT NOT NULL REFERENCES clients(telegram_user_id),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  text TEXT NOT NULL, sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (telegram_chat_id, telegram_message_id)
);
CREATE INDEX IF NOT EXISTS clients_last_contact_at_desc_idx ON clients (last_contact_at DESC);
CREATE INDEX IF NOT EXISTS messages_sent_at_desc_idx ON messages (sent_at DESC);
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/infrastructure/postgres/run-migrations.test.ts`

Expected: PASS.

```bash
git add package.json package-lock.json .env.example compose.yml src/infrastructure/postgres/run-migrations.ts tests/infrastructure/postgres/run-migrations.test.ts
git commit -m "feat: add PostgreSQL schema and configuration"
```

### Task 2: Implement port, use cases, and PostgreSQL storage

**Files:**
- Create: `src/application/ports/interaction-store.ts`
- Create: `src/application/record-telegram-interaction.ts`, `get-clients.ts`, `get-messages.ts`
- Create: `src/infrastructure/postgres/postgres-interaction-store.ts`
- Test: `tests/application/record-telegram-interaction.test.ts`
- Test: `tests/infrastructure/postgres/postgres-interaction-store.test.ts`

**Interfaces:**
- Produces: `InteractionStore.record(input)`, `.listClients()`, `.listMessages()`.
- Consumes: `RecordTelegramInteraction.execute(input)`, `GetClients.execute()`, `GetMessages.execute()`.

- [ ] **Step 1: Write failing application and adapter tests**

```ts
const store = { record: vi.fn(), listClients: vi.fn(), listMessages: vi.fn() };
const useCase = new RecordTelegramInteraction(store);
await useCase.execute({
  telegramUserId: 7, chatId: 7, messageId: 11, firstName: 'Ann',
  username: null, direction: 'incoming', text: 'EUR',
  sentAt: new Date('2026-09-22T10:00:00Z'),
});
expect(store.record).toHaveBeenCalledWith(expect.objectContaining({
  telegramUserId: 7, direction: 'incoming',
}));
```

Mock the database transaction and assert its SQL contains `ON CONFLICT (telegram_chat_id, telegram_message_id) DO NOTHING`, `ORDER BY last_contact_at DESC`, and `ORDER BY sent_at DESC`.

- [ ] **Step 2: Prove failure**

Run: `npm test -- tests/application/record-telegram-interaction.test.ts tests/infrastructure/postgres/postgres-interaction-store.test.ts`

Expected: FAIL; interfaces absent.

- [ ] **Step 3: Define contract and use cases**

Define `Direction = 'incoming' | 'outgoing'`, `InteractionInput`, `Client`, `StoredMessage`, and `InteractionStore`. Use camelCase in this application layer. Keep each use case a thin injected-port wrapper; never import Telegraf or pg in application files.

- [ ] **Step 4: Implement the adapter**

Use a database transaction in `record`: upsert client profile and set `last_contact_at = GREATEST(clients.last_contact_at, EXCLUDED.last_contact_at)`; insert message with duplicate conflict ignored. Map snake_case database rows to camelCase. Read clients with `ORDER BY last_contact_at DESC` and messages with `ORDER BY sent_at DESC`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/application/record-telegram-interaction.test.ts tests/infrastructure/postgres/postgres-interaction-store.test.ts`

Expected: PASS.

```bash
git add src/application src/infrastructure/postgres/postgres-interaction-store.ts tests/application/record-telegram-interaction.test.ts tests/infrastructure/postgres/postgres-interaction-store.test.ts
git commit -m "feat: persist Telegram interactions"
```

### Task 3: Expose the exact read API

**Files:**
- Create: `src/presentation/http/register-clients-route.ts`, `register-messages-route.ts`
- Modify: `src/app.ts`
- Test: `tests/presentation/http/clients.test.ts`, `messages.test.ts`, `health.test.ts`

**Interfaces:**
- Consumes: `GetClients.execute(): Promise<Client[]>`, `GetMessages.execute(): Promise<StoredMessage[]>`.
- Produces: `GET /api/clients`, `GET /api/messages`.

- [ ] **Step 1: Write failing route tests**

```ts
app = await buildApp({
  logger: false,
  getClients: { execute: async () => [{
    telegramUserId: 7, firstName: 'Ann', username: null,
    lastContactAt: new Date('2026-09-22T10:00:00Z'),
  }] },
  getMessages: { execute: async () => [] },
});
const response = await app.inject({ method: 'GET', url: '/api/clients' });
expect(response.statusCode).toBe(200);
expect(response.json()[0].telegramUserId).toBe(7);
```

Write a messages test that injects two newest-first entries, calls `/api/messages`, and asserts the same order in JSON.

- [ ] **Step 2: Prove failure**

Run: `npm test -- tests/presentation/http/clients.test.ts tests/presentation/http/messages.test.ts`

Expected: FAIL; routes do not exist.

- [ ] **Step 3: Implement routes and app wiring**

Register exactly:

```ts
app.get('/api/clients', async () => getClients.execute());
app.get('/api/messages', async () => getMessages.execute());
```

Extend `buildApp` options with `getClients` and `getMessages`; update health test with empty stubs.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/presentation/http/health.test.ts tests/presentation/http/clients.test.ts tests/presentation/http/messages.test.ts`

Expected: PASS.

```bash
git add src/app.ts src/presentation/http tests/presentation/http
git commit -m "feat: expose client and message endpoints"
```

### Task 4: Persist private Telegram interactions and deploy

**Files:**
- Modify: `src/presentation/telegram/create-telegram-bot.ts`, `src/main.ts`, `README.md`
- Test: `tests/presentation/telegram/create-telegram-bot.test.ts`
- Modify on server: `/opt/currency-bot/.env`

**Interfaces:**
- Consumes: `RecordTelegramInteraction.execute(input)` and `handleText(text)`.
- Produces: Telegraf handler that stores private events around replies.

- [ ] **Step 1: Write failing adapter tests**

Export `createTextUpdateHandler(handleText, recordInteraction, logError)`. With fake private context, assert incoming persistence precedes `reply` and outgoing persistence uses reply `message_id` and `date`. With group context, assert recorder is never called.

```ts
expect(recordInteraction.execute).toHaveBeenNthCalledWith(1,
  expect.objectContaining({ direction: 'incoming', text: 'EUR' }));
expect(recordInteraction.execute).toHaveBeenNthCalledWith(2,
  expect.objectContaining({ direction: 'outgoing', text: '1 EUR = 1.08 USD' }));
```

- [ ] **Step 2: Prove failure**

Run: `npm test -- tests/presentation/telegram/create-telegram-bot.test.ts`

Expected: FAIL; handler has no recorder.

- [ ] **Step 3: Implement safe persistence and production wiring**

Persist only where `context.chat.type === 'private'`. Record incoming, send reply, then record outgoing. Put each recorder call in `try/catch` calling `logError(error)`; do not hide reply/currency failures.

In `main.ts`, require `DATABASE_URL`, create `Pool`, call migration before `app.listen`, construct adapter/use cases, pass them to app/bot, and call `await pool.end()` in graceful shutdown.

- [ ] **Step 4: Document and fully verify**

Document:

```text
GET http://159.194.226.200:3000/api/clients
GET http://159.194.226.200:3000/api/messages
```

Run: `npm test && npm run typecheck && npm run build`

Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add src/main.ts src/presentation/telegram/create-telegram-bot.ts tests/presentation/telegram/create-telegram-bot.test.ts README.md
git commit -m "feat: record private bot conversations"
git push origin master
```

- [ ] **Step 6: Inspect and deploy server safely**

Before changing server:

```bash
cd /opt/currency-bot
git status --short
docker compose -p currency-bot ps
```

If clean, set database values and matching `DATABASE_URL` in `.env`, retaining owner `currencybot:currencybot` and mode `600`. Then:

```bash
cd /opt/currency-bot
sudo -u currencybot git pull --ff-only
docker compose -p currency-bot up -d --build
docker compose -p currency-bot ps
docker compose -p currency-bot logs --tail=100 bot postgres
curl --fail http://127.0.0.1:3000/api/clients
curl --fail http://127.0.0.1:3000/api/messages
```

Expected: healthy bot/postgres and HTTP 200 JSON. Send a direct text to the bot and confirm its user is first in `/api/clients` and both new records are first in `/api/messages`.

## Plan self-review

- Spec coverage: Task 1 configuration/schema; Task 2 persistence, deduplication, contact date, ordering; Task 3 both HTTP contracts; Task 4 private incoming/outgoing handling, resilience, push, deployment, and acceptance check.
- Placeholder scan: complete.
- Type consistency: routes use GetClients/GetMessages and Telegraf uses RecordTelegramInteraction, all defined by Task 2.

