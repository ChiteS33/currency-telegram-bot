# Currency Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript Telegram bot that returns a supplied currency's value in USD.

**Architecture:** Fastify owns HTTP lifecycle, `/health`, configuration, and logging. Telegram and Frankfurter are infrastructure adapters around an application use case; domain and application code do not import either external library.

**Tech Stack:** Node.js, TypeScript, Fastify, Telegraf, native `fetch`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-07-currency-telegram-bot-design.md`

## Global Constraints

- Use TypeScript with strict type checking.
- Accept exactly one three-letter currency code, case-insensitively.
- Request the rate for one unit to USD from Frankfurter without an API key.
- Use Telegram long polling for local and server deployment; no webhook or tunnel is required.
- Read `TELEGRAM_BOT_TOKEN` only from environment configuration and never commit it.
- Do not initialize, configure, or use Git.

---

## File Structure

```text
src/
  domain/currency-code.ts                 CurrencyCode value object and validation
  domain/exchange-rate.ts                 ExchangeRate result type
  application/errors.ts                   Typed application errors
  application/ports/exchange-rate-provider.ts
                                           External-rate-provider boundary
  application/get-exchange-rate.ts        Main use case
  infrastructure/frankfurter-exchange-rate-provider.ts
                                           HTTP implementation of the provider port
  presentation/telegram/currency-message-handler.ts
                                           Pure message-to-reply adapter logic
  presentation/telegram/create-telegram-bot.ts
                                           Telegraf registration and lifecycle wrapper
  presentation/http/register-health-route.ts
                                           Fastify health endpoint
  app.ts                                  Dependency composition without listening
  main.ts                                 Runtime startup and graceful shutdown
tests/
  domain/currency-code.test.ts
  application/get-exchange-rate.test.ts
  infrastructure/frankfurter-exchange-rate-provider.test.ts
  presentation/telegram/currency-message-handler.test.ts
  presentation/http/health.test.ts
package.json, tsconfig.json, vitest.config.ts, .env.example, README.md
```

### Task 1: Project foundation and domain types

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/domain/currency-code.ts`, `src/domain/exchange-rate.ts`
- Test: `tests/domain/currency-code.test.ts`

**Interfaces:**
- Produces: `CurrencyCode.parse(input: string): CurrencyCode`, `CurrencyCode.value: string`, and `ExchangeRate { base: CurrencyCode; quote: 'USD'; rate: number; date?: string }`.

- [ ] Write tests proving `eur` normalizes to `EUR`, `USD` is accepted, and blank, four-character, numeric, and mixed-symbol input throw `InvalidCurrencyCodeError`.
- [ ] Run `npm test -- currency-code` and confirm it fails because the module does not exist.
- [ ] Add strict TypeScript, Vitest scripts, runtime dependencies `fastify` and `telegraf`, and development dependencies `typescript`, `tsx`, `vitest`, and `@types/node`.
- [ ] Implement `CurrencyCode.parse` using `/^[A-Z]{3}$/` after `trim().toUpperCase()`, plus the immutable `ExchangeRate` interface.
- [ ] Run `npm test -- currency-code` and `npm run typecheck`; both must pass.

### Task 2: Application port and use case

**Files:**
- Create: `src/application/errors.ts`, `src/application/ports/exchange-rate-provider.ts`, `src/application/get-exchange-rate.ts`
- Test: `tests/application/get-exchange-rate.test.ts`

**Interfaces:**
- Consumes: `CurrencyCode` and `ExchangeRate` from Task 1.
- Produces: `ExchangeRateProvider.getUsdRate(base: CurrencyCode): Promise<ExchangeRate>` and `GetExchangeRate.execute(input: string): Promise<ExchangeRate>`.

- [ ] Write a fake provider in the test that records its `CurrencyCode` argument and returns a known rate; assert `execute('eur')` returns it and calls the provider with `EUR`.
- [ ] Add tests that malformed input fails before the fake provider is called and provider errors propagate unchanged.
- [ ] Run `npm test -- get-exchange-rate` and confirm failure because application modules do not exist.
- [ ] Implement `GetExchangeRate` as a constructor-injected class which parses input then delegates exactly once to `getUsdRate`.
- [ ] Run the application and domain tests plus `npm run typecheck`; all must pass.

### Task 3: Frankfurter provider adapter

**Files:**
- Create: `src/infrastructure/frankfurter-exchange-rate-provider.ts`
- Test: `tests/infrastructure/frankfurter-exchange-rate-provider.test.ts`

**Interfaces:**
- Consumes: `ExchangeRateProvider`, `CurrencyCode`, and `ExchangeRate`.
- Produces: `FrankfurterExchangeRateProvider(fetchImpl?: typeof fetch)`.

- [ ] Mock `fetch` in tests and assert the adapter requests `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD` for `EUR`.
- [ ] Add tests mapping `{ date: '2026-01-02', rates: { USD: 1.08 } }` to an `ExchangeRate`, and mapping HTTP failure, rejected fetch, and missing/non-numeric USD rate to `RateProviderError`.
- [ ] Run `npm test -- frankfurter` and confirm the module is absent.
- [ ] Implement the adapter with `encodeURIComponent(base.value)`, `response.ok` validation, JSON shape validation, and no external HTTP package.
- [ ] Run provider tests, the complete `npm test`, and `npm run typecheck`; all must pass.

### Task 4: Telegram message adapter

**Files:**
- Create: `src/presentation/telegram/currency-message-handler.ts`, `src/presentation/telegram/create-telegram-bot.ts`
- Test: `tests/presentation/telegram/currency-message-handler.test.ts`

**Interfaces:**
- Consumes: `GetExchangeRate` and application errors.
- Produces: `createCurrencyMessageHandler(useCase): (text: string) => Promise<string>` and `createTelegramBot(token, handler): Telegraf`.

- [ ] Test that `eur` produces `1 EUR = 1.08 USD` and includes `2026-01-02` when the use case returns that date.
- [ ] Test malformed text produces an instruction containing `EUR`; test `RateProviderError` produces a temporary-unavailability message without its internal error text.
- [ ] Run `npm test -- currency-message-handler` and confirm failure before implementation.
- [ ] Implement the pure handler and attach it only to text messages in Telegraf. Ignore non-text updates. Register `bot.catch` to log unexpected processing errors without exposing them to users.
- [ ] Run the Telegram tests and complete test suite; all must pass.

### Task 5: Fastify host, runtime, documentation, and final verification

**Files:**
- Create: `src/presentation/http/register-health-route.ts`, `src/app.ts`, `src/main.ts`, `README.md`
- Modify: `.env.example`, `package.json`
- Test: `tests/presentation/http/health.test.ts`

**Interfaces:**
- Produces: `buildApp(options?: { logger?: boolean }): FastifyInstance` with `GET /health` returning `{ status: 'ok' }`.
- Runtime: `main.ts` reads `TELEGRAM_BOT_TOKEN`, starts Fastify on `PORT` or `3000`, launches Telegraf polling, and stops both on `SIGINT` and `SIGTERM`.

- [ ] Write a Fastify `inject` test asserting `GET /health` responds `200` with `{ status: 'ok' }`.
- [ ] Run `npm test -- health` and confirm failure before route registration.
- [ ] Implement `buildApp`, register the health route, compose `GetExchangeRate` with `FrankfurterExchangeRateProvider`, and attach the Telegram bot.
- [ ] Implement startup validation: when `TELEGRAM_BOT_TOKEN` is empty, print a clear error and exit with code 1 before starting polling.
- [ ] Document installation, creating a bot token with BotFather, copying `.env.example` to `.env`, starting in development, testing, and optional tunneling/webhook notes. State explicitly that long polling does not need a tunnel.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`. Start the service with a placeholder-free token only after the user supplies one; otherwise verify `/health` through Fastify injection.

## Plan self-review

- Spec coverage: Tasks 1–5 cover strict typing, Fastify, Telegraf, Frankfurter, parsing, success and error messages, logging, health check, and every specified test category.
- No placeholders: all created files, public interfaces, URLs, expected outcomes, and validation cases are named explicitly.
- Type consistency: `CurrencyCode`, `ExchangeRate`, `ExchangeRateProvider`, and `GetExchangeRate` are introduced before their consumers.
