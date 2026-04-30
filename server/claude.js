'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `Ты — менеджер отдела продаж курса «ДНК Бизнеса» Ксении Смирновой.
Ксения — 12 лет в бьюти, собственный работающий салон, открыла салон в Москве с нуля — 600 000 ₽ в первый месяц.
Продажи ведутся ТОЛЬКО в переписке, звонков нет.

Правила сообщения:
1. Начни с того что посмотрели на цифры бизнеса и увидели конкретные вещи
2. Назови главную боль из диагностики — своими словами, попади в ситуацию
3. Покажи потенциал в рублях (используй переданные цифры)
4. Приведи 1 релевантный кейс Ксении:
   - Если боль = база: «50 звонков по базе → 10 записей → 40–70к в кассу без рекламы»
   - Если боль = персонал: «Один правильно нанятый мастер удвоил выручку направления за 6 недель»
   - Если боль = финансы: «Клиент поймал управляющую на воровстве 100к/мес — окупил обучение за один месяц»
   - Если боль = загрузка: «Продлили рабочие часы на 2 часа → +30% к выручке без новых вложений»
   - Если боль = продажи или удержание: выбери наиболее подходящий кейс из списка выше
5. Один вопрос в конце — что мешает это исправить?
6. Тон: прямой, живой, без пафоса. Как от человека который честно видит проблему
7. Длина: 4–6 предложений
8. НЕ упоминать курс и цену
9. Русский язык, неформально
Вернуть только текст сообщения без пояснений и без кавычек вокруг сообщения.`;

async function generateMessage(diagData) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_key_here') {
    return '[API ключ не настроен. Добавьте ANTHROPIC_API_KEY в файл .env]';
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const {
    nicheLabel, city, revenue, masters, seats,
    baseSize, activeClients, activeRate,
    top2Pains, totalMonthly, totalAnnual,
    abonPotential, segmentLabel, mainPain
  } = diagData;

  const cityLabel = city === 'moscow' ? 'Москва / СПб' : 'Регион';

  const userPrompt = `Данные диагностики клиента:
- Ниша: ${nicheLabel}
- Город: ${cityLabel}
- Выручка: ${Number(revenue).toLocaleString('ru-RU')} ₽/мес
- Мастеров: ${masters}, рабочих мест: ${seats}
- База: ${Number(baseSize).toLocaleString('ru-RU')} клиентов, активных: ${Number(activeClients).toLocaleString('ru-RU')} (${activeRate}%)
- Норма рынка АКБ: 20%
- Главные точки потерь: ${top2Pains}
- Потенциал роста: ${Number(totalMonthly).toLocaleString('ru-RU')} ₽/мес, ${Number(totalAnnual).toLocaleString('ru-RU')} ₽/год
- Что даст реактивация базы в первый месяц: ${Number(abonPotential).toLocaleString('ru-RU')} ₽
- Сегмент лида: ${segmentLabel}
- Главная боль: ${mainPain}`;

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 800,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userPrompt }]
  });

  return response.content[0].text;
}

module.exports = { generateMessage };
