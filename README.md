# Currency Telegram Bot

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
