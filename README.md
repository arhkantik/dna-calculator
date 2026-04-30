# ДНК Бизнеса — Диагностический калькулятор

Инструмент отдела продаж: вводите данные лида → система считает потери в рублях → Claude генерирует WhatsApp-сообщение.

## Требования

- **Node.js 18+** — установить через [nodejs.org](https://nodejs.org) или `brew install node`
- **API-ключ Anthropic** — получить на [console.anthropic.com](https://console.anthropic.com)

## Быстрый старт

### 1. Установка зависимостей

```bash
cd dna-calculator
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Настройка API-ключа

Откройте файл `.env` и вставьте ваш ключ Anthropic:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

### 3. Запуск

```bash
npm run dev
```

Откроется:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## Тестовый кейс

Для проверки используйте данные:
- Ниша: Ногти / ресницы / брови
- Город: Регион
- Выручка: 450 000 ₽/мес
- Мастеров: 3, рабочих мест: 4
- База: 800 клиентов, активных: 100
- Сегмент: P2 — Тёплый

## Структура

```
dna-calculator/
├── server/
│   ├── index.js       — Express API
│   ├── calculate.js   — Логика расчётов (бенчмарки Ксении Смирновой)
│   ├── claude.js      — Anthropic API
│   ├── db.js          — SQLite база данных
│   └── diagnostics.db — Создаётся автоматически
├── client/
│   └── src/
│       ├── App.jsx
│       ├── Step1Form.jsx
│       ├── Step2Diagnostic.jsx
│       ├── Step3Results.jsx
│       ├── History.jsx
│       └── api.js
├── .env
└── package.json
```

## API

- `POST /api/diagnose` — запустить диагностику
- `GET /api/history` — последние 20 диагностик
- `GET /api/diagnostic/:id` — одна диагностика по ID
