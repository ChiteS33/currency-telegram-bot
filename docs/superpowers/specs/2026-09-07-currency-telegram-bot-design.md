# Currency Telegram Bot — Design

## Goal

Build a small educational Telegram bot. A user sends a three-letter currency code such as `EUR`; the bot responds with the value of one unit of that currency in US dollars.

## Scope of the first version

- Node.js and TypeScript.
- Fastify is the application host and exposes `GET /health`.
- Telegraf receives Telegram messages by long polling.
- Frankfurter is the exchange-rate provider. No API key is required.
- The bot accepts a single three-letter code case-insensitively.
- A successful response includes the rate and, when supplied by the provider, its date.
- Invalid input and unknown currencies receive a concise explanation with the example `EUR`.
- Provider failures return a friendly error to the user and are logged through Fastify.

## Architecture

The code follows dependency inversion and stays intentionally small:

```text
presentation (Telegram, HTTP)
          -> application (use case)
          -> domain (types and rules)
          <- infrastructure (Frankfurter adapter)
```

`application` defines an `ExchangeRateProvider` port and the `GetExchangeRate` use case. The Frankfurter client implements that port. The Telegram handler only parses incoming text, invokes the use case, and formats a response. Fastify composes all dependencies and owns lifecycle and logging.

## Suggested layout

```text
src/
  domain/
  application/
  infrastructure/
  presentation/
  main.ts
```

## Data flow

1. A user sends `EUR` to Telegram.
2. The Telegram adapter normalizes and validates the code.
3. It invokes `GetExchangeRate`.
4. The use case requests a rate to USD through `ExchangeRateProvider`.
5. The Frankfurter adapter calls the external HTTP API.
6. The handler sends a formatted success or error message.

## Error handling

- Malformed messages never call the provider.
- An unsupported code becomes a user-facing validation message.
- Network, timeout, and malformed-provider-response errors are logged and mapped to one generic temporary-unavailability message.

## Testing

- Unit-test `GetExchangeRate` with a fake provider: success, unsupported code, and provider failure.
- Unit-test the Telegram text handler for normalization, invalid input, success formatting, and failure formatting.
- Add a small Fastify test for `GET /health`.

## Deliberately deferred

- Database, caching, rate history, authentication, admin commands, webhooks, and retries.
- Additional Telegram commands or an HTTP endpoint for rates.

## C4 architecture documentation

The repository maintains three C4 Model source diagrams in `docs/c4/`:

- `01-system-context.puml` identifies the bot's users and external systems.
- `02-container.puml` describes the deployable Node.js process and its entry points.
- `03-component.puml` describes the components that process a Telegram currency request.

The diagrams are PlantUML sources using the bundled C4-PlantUML library. They are documentation only: they introduce no new runtime dependencies, endpoints, or deployment components. Generated images are intentionally not committed, so the diagram source remains the single maintained representation.
