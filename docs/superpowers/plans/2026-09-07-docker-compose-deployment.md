# Isolated Docker Compose Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run one isolated, resource-limited Docker Compose instance of the Currency Telegram Bot on the existing Ubuntu server.

**Architecture:** A multi-stage Node 22 Alpine image compiles and tests TypeScript before producing a non-root runtime image. One `bot` service runs as Compose project `currency-bot`, with no published ports or external networks and with server-only environment variables.

**Tech Stack:** Docker 29, Docker Compose 5, Node.js 22 Alpine, TypeScript, Fastify, Telegraf, Ubuntu 26.04, GitHub.

**Spec:** `docs/superpowers/specs/2026-09-07-docker-compose-deployment-design.md`

## Global Constraints

- Keep long polling and exactly one instance with `TELEGRAM_BOT_TOKEN`.
- Use project name `currency-bot` in `/opt/currency-bot`.
- Do not publish host ports or connect to existing Docker projects, networks, containers, or volumes.
- Store the token only in `/opt/currency-bot/.env` with mode `600`; never commit it.
- Set `restart: unless-stopped`, `cpus: 0.50`, and `mem_limit: 256m`.
- Make the GitHub repository public only after a full-history secret review.
- Do not use unscoped `docker compose down` or `docker system prune`.

---

## File Structure

- `Dockerfile`: build, test, and package a non-root Node runtime image.
- `.dockerignore`: exclude secrets and local artifacts from build context.
- `compose.yml`: define the isolated bot service and its limits.
- `README.md`: document publication, deployment, update, and diagnostics commands.

### Task 1: Add container artifacts

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `compose.yml`

**Interfaces:**
- Consumes: `package.json`, `package-lock.json`, `tsconfig.json`, `src/`, `tests/`, and `vitest.config.ts`.
- Produces: service `bot`, which reads untracked `.env` and starts `node dist/main.js`.

- [ ] **Step 1: Confirm the initial validation fails**

```powershell
docker compose -p currency-bot -f compose.yml config
```

Expected: FAIL because `compose.yml` is absent.

- [ ] **Step 2: Create `.dockerignore`**

```gitignore
node_modules/
dist/
.env
.git/
.idea/
.pnpm-store/
docs/
README.md
```

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run typecheck && npm test && npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S currencybot && adduser -S currencybot -G currencybot
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER currencybot
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
```

- [ ] **Step 4: Create `compose.yml`**

```yaml
services:
  bot:
    build:
      context: .
    env_file:
      - .env
    init: true
    restart: unless-stopped
    cpus: 0.50
    mem_limit: 256m
    security_opt:
      - no-new-privileges:true
```

Do not add `ports`, `container_name`, `networks`, `volumes`, `depends_on`, or `deploy`.

- [ ] **Step 5: Validate build and Compose contract**

```powershell
docker compose -p currency-bot -f compose.yml config
docker build --tag currency-bot:test .
```

Expected: Compose has no `ports` and includes the chosen limits. The image build runs typecheck, tests, and build successfully.

- [ ] **Step 6: Commit Task 1**

```powershell
git add Dockerfile .dockerignore compose.yml
git commit -m "feat: add isolated Docker Compose runtime"
```

### Task 2: Add deployment documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `compose.yml` from Task 1.
- Produces: exact project-scoped commands for publication, bootstrap, start, logs, and updates.

- [ ] **Step 1: Confirm Docker documentation is absent**

```powershell
rg -n "docker compose -p currency-bot" README.md
```

Expected: FAIL with exit code 1.

- [ ] **Step 2: Append `## Docker deployment` to `README.md`**

Add Russian guidance containing these exact commands and state: enter the token only on the server, no ports are opened, and use `-p currency-bot` for every operational command.

```bash
# Development machine: review before making repository public.
git log --all -- .env
git grep -n -I -e 'TELEGRAM_BOT_TOKEN=' $(git rev-list --all)
gh repo edit ChiteS33/currency-telegram-bot --visibility public --accept-visibility-change-consequences

# Ubuntu server: execute once.
adduser --system --group --home /opt/currency-bot currencybot
install -d -o currencybot -g currencybot -m 750 /opt/currency-bot
sudo -u currencybot git clone https://github.com/ChiteS33/currency-telegram-bot.git /opt/currency-bot
sudo -u currencybot sh -c 'umask 077 && printf "TELEGRAM_BOT_TOKEN=REPLACE_WITH_BOTFATHER_TOKEN\nPORT=3000\n" > /opt/currency-bot/.env'
chmod 600 /opt/currency-bot/.env

# Initial start and updates from /opt/currency-bot.
sudo -u currencybot git pull --ff-only
docker compose -p currency-bot up -d --build
docker compose -p currency-bot ps
docker compose -p currency-bot logs --tail=100
```

- [ ] **Step 3: Verify README content**

```powershell
rg -n "currency-bot|--visibility public|TELEGRAM_BOT_TOKEN" README.md
```

Expected: all expressions are present in the Docker section.

- [ ] **Step 4: Commit Task 2**

```powershell
git add README.md
git commit -m "docs: add Docker deployment guide"
```

### Task 3: Publish and deploy safely

**Files:**
- Create on server: `/opt/currency-bot/.env`
- Create on server: Compose image and service for `currency-bot`

**Interfaces:**
- Consumes: the public `ChiteS33/currency-telegram-bot` repository and Task 1 artifacts.
- Produces: one healthy `currency-bot-bot-1` container with no host port bindings.

- [ ] **Step 1: Review all Git history and publish the repository**

```powershell
git log --all -- .env
git grep -n -I -e 'TELEGRAM_BOT_TOKEN=' $(git rev-list --all)
git push origin master
gh repo edit ChiteS33/currency-telegram-bot --visibility public --accept-visibility-change-consequences
```

Expected: the first command has no output; the second contains no real token, password, or key; GitHub shows the repository is public.

- [ ] **Step 2: Confirm no old bot instance is polling**

Run on the server:

```bash
docker compose -p currency-bot -f /opt/currency-bot/compose.yml ps 2>/dev/null || true
systemctl status currency-bot --no-pager 2>/dev/null || true
```

Expected: no existing currency-bot container or service is running. Do not stop unrelated containers.

- [ ] **Step 3: Bootstrap and launch**

Run on the server as root:

```bash
id currencybot >/dev/null 2>&1 || adduser --system --group --home /opt/currency-bot currencybot
install -d -o currencybot -g currencybot -m 750 /opt/currency-bot
sudo -u currencybot git clone https://github.com/ChiteS33/currency-telegram-bot.git /opt/currency-bot
sudo -u currencybot sh -c 'umask 077 && printf "TELEGRAM_BOT_TOKEN=REPLACE_WITH_BOTFATHER_TOKEN\nPORT=3000\n" > /opt/currency-bot/.env'
chown currencybot:currencybot /opt/currency-bot/.env
chmod 600 /opt/currency-bot/.env
cd /opt/currency-bot
docker compose -p currency-bot up -d --build
```

Replace `REPLACE_WITH_BOTFATHER_TOKEN` only interactively on the server. Expected: only the `currency-bot-bot-1` service is created.

- [ ] **Step 4: Verify health, isolation, and behaviour**

```bash
cd /opt/currency-bot
docker compose -p currency-bot ps
docker inspect --format '{{range $port, $bindings := .NetworkSettings.Ports}}{{println $port $bindings}}{{end}}' currency-bot-bot-1
docker inspect --format '{{.State.Health.Status}}' currency-bot-bot-1
docker compose -p currency-bot logs --tail=100
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker network ls
```

Expected: bot becomes healthy, has no host bindings, existing RabbitMQ, MongoDB, PostgreSQL, and their networks remain present, and Telegram responds to `EUR`.

- [ ] **Step 5: Record deployment revision**

```bash
cd /opt/currency-bot
git rev-parse --short HEAD
docker compose -p currency-bot ps
```

Expected: record commit ID and service state without copying `.env` or credentials into Git or chat.

## Plan Self-Review

- Spec coverage: Task 1 delivers non-root image, health check, no-port service, restart policy, and limits. Task 2 documents public visibility and isolated operations. Task 3 reviews history, publishes, deploys, and verifies unrelated infrastructure remains unchanged.
- Placeholder scan: `REPLACE_WITH_BOTFATHER_TOKEN` intentionally denotes a user-held secret entered only on the server.
- Interface consistency: all tasks use `/opt/currency-bot`, project `currency-bot`, and service `bot`.

