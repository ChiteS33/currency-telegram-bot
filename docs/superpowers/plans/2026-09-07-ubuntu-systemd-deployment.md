# Currency Telegram Bot Ubuntu Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run one production instance of the Telegram bot continuously on an Ubuntu server and restore it automatically after a process failure or server reboot.

**Architecture:** The existing Node.js process remains unchanged and receives Telegram updates through long polling. Ubuntu `systemd` owns the process lifecycle; a dedicated unprivileged user owns the deployed files and reads the token from a server-only environment file. The Fastify `/health` endpoint is used for local health verification and is not required to be publicly reachable.

**Tech Stack:** Ubuntu, Node.js 20 or newer, npm, systemd, OpenSSH/SCP, TypeScript, Fastify, Telegraf.

**Spec:** `docs/superpowers/specs/2026-09-07-currency-telegram-bot-design.md`

## Global Constraints

- Use the existing Telegram long-polling runtime; do not add a webhook, domain, reverse proxy, or tunnel.
- Run exactly one process with `TELEGRAM_BOT_TOKEN`; concurrent polling processes with the same token are forbidden.
- Keep the production token only in `/opt/currency-telegram-bot/.env`; never add it to Git, an archive, terminal history, or application source code.
- Use Node.js 20 or newer and install production dependencies reproducibly with `npm ci`.
- Run the service as the dedicated `currencybot` system user, never as `root`.
- Permit no inbound firewall rule solely for Telegram polling. The server needs outbound HTTPS access to Telegram and Frankfurter.

---

## File Structure

```text
/opt/currency-telegram-bot/                  Production application directory
  dist/                                       Compiled JavaScript created by npm run build
  node_modules/                               Installed dependencies created by npm ci
  .env                                        Server-only token and PORT configuration
  package.json, package-lock.json, src/, ...  Copied application source and metadata
/etc/systemd/system/currency-bot.service      Persistent process definition
```

### Task 1: Prepare the Ubuntu host and deployment identity

**Files:**
- Create: `/opt/currency-telegram-bot/`
- Create: Linux system user `currencybot`
- Verify: Node.js and npm executables on the server

**Interfaces:**
- Produces: an unprivileged account named `currencybot` and an application directory it owns.
- Consumes: SSH access to the Ubuntu server with an account permitted to run `sudo`.

- [ ] **Step 1: Connect to the server and confirm its operating system**

Run:

```bash
ssh YOUR_SSH_LOGIN@YOUR_SERVER_ADDRESS
cat /etc/os-release
```

Expected: output identifies Ubuntu. `YOUR_SSH_LOGIN` and `YOUR_SERVER_ADDRESS` are the same SSH credentials already used to administer this server.

- [ ] **Step 2: Confirm a supported Node.js version is installed**

Run:

```bash
node --version
npm --version
```

Expected: Node starts with `v20`, `v22`, or a newer major version, and npm prints a version. If `node` is missing or older than v20, install Node.js 20+ using the server's established package-management policy before proceeding; do not mix a root-owned Node installation with a per-user version manager.

- [ ] **Step 3: Create the service account and application directory**

Run:

```bash
sudo adduser --system --group --home /opt/currency-telegram-bot currencybot
sudo mkdir -p /opt/currency-telegram-bot
sudo chown currencybot:currencybot /opt/currency-telegram-bot
sudo chmod 750 /opt/currency-telegram-bot
```

Expected: `id currencybot` succeeds and `/opt/currency-telegram-bot` is owned by `currencybot:currencybot`.

- [ ] **Step 4: Commit the host preparation record**

No repository commit is required: this task changes only the Ubuntu host. Record the Ubuntu release and installed Node.js version in the deployment handoff or server runbook.

### Task 2: Transfer, build, and protect the production application

**Files:**
- Create: `/opt/currency-telegram-bot/.env`
- Create: `/opt/currency-telegram-bot/dist/` via `npm run build`
- Create: `/opt/currency-telegram-bot/node_modules/` via `npm ci`

**Interfaces:**
- Consumes: the current project files, excluding local `node_modules`, `dist`, and `.env`.
- Produces: a compiled application runnable as `npm start` by `currencybot`.

- [ ] **Step 1: Stop every local or old server copy that uses this bot token**

On the development PC, stop `npm run dev` if it is running. On an existing server deployment, run:

```bash
sudo systemctl stop currency-bot 2>/dev/null || true
```

Expected: only the instance configured later in Task 3 will poll Telegram.

- [ ] **Step 2: Copy application files without the secret or generated directories**

From the development PC, create a source archive that excludes `.env`, `node_modules`, and `dist`, then upload it. In PowerShell at the repository root:

```powershell
tar --exclude=.env --exclude=node_modules --exclude=dist -czf currency-telegram-bot.tar.gz .
scp .\currency-telegram-bot.tar.gz YOUR_SSH_LOGIN@YOUR_SERVER_ADDRESS:/tmp/currency-telegram-bot.tar.gz
Remove-Item .\currency-telegram-bot.tar.gz
```

Expected: the archive reaches `/tmp` on the server and the temporary archive on the PC is removed.

- [ ] **Step 3: Extract the release under the dedicated user**

On the server, run:

```bash
sudo rm -rf /opt/currency-telegram-bot/*
sudo tar -xzf /tmp/currency-telegram-bot.tar.gz -C /opt/currency-telegram-bot
sudo rm /tmp/currency-telegram-bot.tar.gz
sudo chown -R currencybot:currencybot /opt/currency-telegram-bot
```

Expected: `/opt/currency-telegram-bot/package.json` exists and no `/opt/currency-telegram-bot/.env` has been copied from the PC.

- [ ] **Step 4: Create the production environment file directly on the server**

Run:

```bash
sudo -u currencybot nano /opt/currency-telegram-bot/.env
```

Enter exactly these keys, replacing only the value after `=` with the token obtained from BotFather:

```env
TELEGRAM_BOT_TOKEN=BOTFATHER_TOKEN
PORT=3000
```

Then protect it:

```bash
sudo chown currencybot:currencybot /opt/currency-telegram-bot/.env
sudo chmod 600 /opt/currency-telegram-bot/.env
```

Expected: `sudo -u currencybot test -r /opt/currency-telegram-bot/.env` succeeds, and `ls -l` shows mode `-rw-------`.

- [ ] **Step 5: Install and compile as the service user**

Run:

```bash
sudo -u currencybot bash -lc 'cd /opt/currency-telegram-bot && npm ci && npm run build && npm run typecheck && npm test'
```

Expected: all commands complete with exit code 0 and `/opt/currency-telegram-bot/dist/main.js` exists.

- [ ] **Step 6: Commit the release preparation**

No repository commit is required: dependencies, build output, and `.env` are server artifacts and are intentionally untracked.

### Task 3: Register the persistent systemd service

**Files:**
- Create: `/etc/systemd/system/currency-bot.service`

**Interfaces:**
- Consumes: `/opt/currency-telegram-bot/dist/main.js`, `/opt/currency-telegram-bot/.env`, and the `currencybot` account.
- Produces: `systemctl start|stop|restart|status currency-bot` lifecycle commands and boot-time startup.

- [ ] **Step 1: Resolve the npm executable path used by systemd**

Run:

```bash
command -v npm
```

Expected: an absolute path such as `/usr/bin/npm`. Copy this exact path for the `ExecStart` line in the next step.

- [ ] **Step 2: Create the service definition**

Run:

```bash
sudo nano /etc/systemd/system/currency-bot.service
```

Paste this content, replacing `/usr/bin/npm` only if the previous step printed a different path:

```ini
[Unit]
Description=Currency Telegram Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=currencybot
Group=currencybot
WorkingDirectory=/opt/currency-telegram-bot
EnvironmentFile=/opt/currency-telegram-bot/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
TimeoutStopSec=30
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Expected: the service file exists, is owned by root, and contains no bot token.

- [ ] **Step 3: Load, enable, and start the service**

Run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now currency-bot
sudo systemctl status currency-bot --no-pager
```

Expected: status is `active (running)` and the service is enabled for the next server boot.

- [ ] **Step 4: Verify the health endpoint locally on the server**

Run:

```bash
curl --fail http://127.0.0.1:3000/health
```

Expected:

```json
{"status":"ok"}
```

- [ ] **Step 5: Commit the service registration**

No repository commit is required because the unit file belongs to the server. Preserve its exact content in the deployment runbook if the server configuration is managed outside the repository.

### Task 4: Verify recovery and establish the update flow

**Files:**
- Modify on each release: `/opt/currency-telegram-bot/` application files, excluding `.env`
- Verify: `currency-bot.service` and `/health`

**Interfaces:**
- Consumes: the deployment archive process from Task 2.
- Produces: a repeatable update procedure with observable logs and automatic process recovery.

- [ ] **Step 1: Test a real Telegram update**

Send `EUR` to the bot from Telegram.

Expected: it replies with the USD rate. This proves that the server can reach both Telegram and the exchange-rate provider.

- [ ] **Step 2: Test automatic process recovery**

Run:

```bash
sudo systemctl kill --signal=SIGKILL currency-bot
sleep 8
sudo systemctl is-active currency-bot
```

Expected: final output is `active`. `Restart=always` should have started a replacement process.

- [ ] **Step 3: Test boot-time startup at the next planned maintenance window**

Run during a safe maintenance window:

```bash
sudo reboot
```

After reconnecting, run:

```bash
sudo systemctl is-enabled currency-bot
sudo systemctl is-active currency-bot
```

Expected: outputs are `enabled` and `active`.

- [ ] **Step 4: Use this update sequence for every future bot release**

1. Develop and test locally: `npm test`, `npm run typecheck`, `npm run build`.
2. Stop the local development bot before the server bot is restarted.
3. Create and upload the archive using Task 2, Step 2; do not include `.env`.
4. On the server, stop the service: `sudo systemctl stop currency-bot`.
5. Extract the archive as in Task 2, Step 3, preserving the existing server `.env` by copying it temporarily before extraction and restoring it afterward.
6. Run the Task 2, Step 5 build and test command.
7. Start the new version: `sudo systemctl start currency-bot`.
8. Verify `systemctl status`, `curl http://127.0.0.1:3000/health`, and one real `EUR` Telegram message.

- [ ] **Step 5: Use these diagnostics when something fails**

```bash
sudo systemctl status currency-bot --no-pager
sudo journalctl -u currency-bot -n 100 --no-pager
sudo journalctl -u currency-bot -f
```

Expected: service state and the latest application logs identify startup errors, token configuration errors, or network failures without exposing the token.

- [ ] **Step 6: Commit deployment documentation**

```bash
git add docs/superpowers/plans/2026-09-07-ubuntu-systemd-deployment.md
git commit -m "docs: add Ubuntu systemd deployment plan"
```

Expected: the deployment plan is versioned; no `.env`, `node_modules`, or `dist` file is included in the commit.

## Plan Self-Review

- Spec coverage: the plan preserves long polling, the existing `/health` endpoint, token environment configuration, graceful `SIGTERM` shutdown, and the one-process constraint specified by the current design.
- Security coverage: the token is created only on the server with mode `600`; the runtime has no root privileges and no inbound port is required for polling.
- Operations coverage: installation, startup at boot, restart after a crash, observability, verification, and subsequent releases are covered by Tasks 1-4.
- Placeholder scan: no implementation behavior, file path, service name, command, or expected outcome is unspecified. SSH account/address and BotFather token are deployment credentials supplied by the server owner and are deliberately represented symbolically rather than recorded in the repository.
