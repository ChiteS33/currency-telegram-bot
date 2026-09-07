# Currency Telegram Bot

## Docker deployment

Бот запускается на сервере как отдельный Compose-проект `currency-bot`. Он использует Telegram long polling, поэтому наружные порты не открываются: `/health` доступен только внутри контейнера. Не запускайте больше одного экземпляра с тем же `TELEGRAM_BOT_TOKEN`.

Перед первой публикацией проверьте историю Git и сделайте репозиторий публичным только если в ней нет настоящего токена, пароля или ключа:

```bash
git log --all -- .env
git grep -n -I -e 'TELEGRAM_BOT_TOKEN=' $(git rev-list --all)
gh repo edit ChiteS33/currency-telegram-bot --visibility public --accept-visibility-change-consequences
```

На Ubuntu-сервере под `root` подготовьте каталог и клонируйте репозиторий:

```bash
id currencybot >/dev/null 2>&1 || adduser --system --group --home /opt/currency-bot currencybot
install -d -o currencybot -g currencybot -m 750 /opt/currency-bot
sudo -u currencybot git clone https://github.com/ChiteS33/currency-telegram-bot.git /opt/currency-bot
sudo -u currencybot nano /opt/currency-bot/.env
chown currencybot:currencybot /opt/currency-bot/.env
chmod 600 /opt/currency-bot/.env
```

В `.env` укажите только значения, полученные от BotFather:

```env
TELEGRAM_BOT_TOKEN=BOTFATHER_TOKEN
PORT=3000
```

Первый запуск и все обновления выполняйте только из `/opt/currency-bot` и всегда с именем проекта:

```bash
cd /opt/currency-bot
sudo -u currencybot git pull --ff-only
docker compose -p currency-bot up -d --build
docker compose -p currency-bot ps
docker compose -p currency-bot logs --tail=100
```

Не используйте для этого приложения `docker compose down` без `-p currency-bot` или `docker system prune`: эти команды могут затронуть другие проекты на сервере.

Учебный Telegram-бот на Node.js, TypeScript и Fastify. Отправьте ему код валюты (`EUR`, `GBP`, `JPY`), и он вернёт стоимость одной единицы в долларах США.

## Что внутри

- Чистые слои: domain → application → infrastructure/presentation.
- Fastify с `GET /health`.
- Telegraf и Telegram long polling.
- Бесплатный источник курсов [Frankfurter](https://frankfurter.dev/).
- Тесты Vitest и строгая проверка TypeScript.

## Запуск

1. Создайте бота через [@BotFather](https://t.me/BotFather) и скопируйте токен.
2. Скопируйте `.env.example` в `.env` и замените значение `TELEGRAM_BOT_TOKEN`.
3. Установите зависимости: `npm install`.
4. Запустите приложение: `npm run dev`.

Проверка Fastify: откройте `http://localhost:3000/health`. Ожидаемый ответ: `{ "status": "ok" }`.

## Проверки

```bash
npm test
npm run typecheck
npm run build
```

## Туннель и деплой

Сейчас бот использует long polling, поэтому туннель не нужен: он сам периодически получает новые сообщения Telegram. Для сервера достаточно передать переменные окружения `TELEGRAM_BOT_TOKEN` и, при необходимости, `PORT`, затем выполнить `npm run build` и `npm start`.

Если в будущем понадобится принимать Telegram webhook через публичный URL/туннель, это можно добавить отдельным адаптером, не меняя сценарий получения курса.
# C4 Model diagrams

The editable PlantUML C4 diagrams are in [docs/c4](docs/c4/README.md): system context, container, and Telegram request-flow component views.
