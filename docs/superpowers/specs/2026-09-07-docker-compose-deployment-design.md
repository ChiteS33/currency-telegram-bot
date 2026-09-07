# Isolated Docker Compose Deployment Design

## Goal

Run one production instance of the Currency Telegram Bot on the existing Ubuntu server without modifying, restarting, joining, or exposing the existing MongoDB, PostgreSQL, and RabbitMQ Compose projects.

## Scope and Constraints

- The bot continues to use Telegram long polling. Exactly one container may use `TELEGRAM_BOT_TOKEN` at a time.
- The deployment is a separate Compose project named `currency-bot` in `/opt/currency-bot`.
- The bot has no published host ports. Its Fastify health route is available only inside the container.
- The existing Docker containers and their networks remain unchanged.
- The production token is stored only in `/opt/currency-bot/.env`, is excluded from Git, and has mode `600`.
- The GitHub repository is made public only after confirming that its complete history contains no token, deploy key, server password, or other secret.
- The server is Ubuntu 26.04 with Docker 29 and Compose 5. It has 1.9 GiB RAM, no swap, and approximately 1.0 GiB currently available RAM.

## Architecture

The repository adds a multi-stage `Dockerfile`, `.dockerignore`, and `compose.yml`.

The builder stage installs dependencies from `package-lock.json` and compiles TypeScript. The final image copies the compiled output and production dependencies, runs as a non-root user, and starts `dist/main.js`.

The Compose project runs one `bot` service on its own default bridge network. It does not declare `ports`, `container_name`, links, external networks, volumes, or dependencies on other projects. Docker's default isolated network still permits the outbound HTTPS calls required by Telegram and Frankfurter.

The service reads `TELEGRAM_BOT_TOKEN` and `PORT` from the server-only `.env` file. It uses `restart: unless-stopped`, Docker init handling, a health check against `http://127.0.0.1:3000/health`, and resource limits of 0.5 CPU and 256 MiB memory. The runtime container should normally use only a small fraction of those limits; the initial image build is the only temporary higher-memory operation.

## Server Bootstrap and Source Access

Create an unprivileged `currencybot` account that owns `/opt/currency-bot`. Make the `ChiteS33/currency-telegram-bot` GitHub repository public after completing the required history review. The server clones the public repository over HTTPS and needs no GitHub deploy key or repository credential.

Clone the public repository into `/opt/currency-bot`. Create `.env` directly on the server, set `TELEGRAM_BOT_TOKEN` and `PORT=3000`, and set its permissions to `600`. The environment file is never committed to Git.

## Lifecycle

Initial start and each update use only commands scoped to the project directory and project name:

1. Confirm no local development process or older service is polling with the same Telegram token.
2. In `/opt/currency-bot`, obtain the intended Git revision using `git pull --ff-only`.
3. Run tests and build the image during a low-load period.
4. Start or update with `docker compose -p currency-bot up -d --build`.
5. Verify `docker compose -p currency-bot ps`, the health status, logs, and a real `EUR` message to the bot.

Only commands including `-p currency-bot` are used for operational actions. No broad `docker compose down`, `docker system prune`, or commands targeting existing containers or networks are part of this deployment.

## Failure Handling and Observability

The application already handles `SIGTERM`; Docker restart policy restores it after an unexpected exit or host reboot. Logs are read using `docker compose -p currency-bot logs`; they never contain the token. A failed build must be corrected before deployment. If the health check is unhealthy, inspect the project-scoped logs and application configuration without restarting unrelated containers.

## Verification

- Repository working tree contains no token or server deploy key.
- The repository is public only after a history review confirms that it contains no secret.
- Image build completes without exhausting the server's available RAM or disk.
- The `currency-bot` service is running and healthy.
- `docker ps` shows no published ports for the bot.
- Existing containers, networks, and their uptime are unchanged.
- Telegram replies correctly to `EUR` after deployment.
