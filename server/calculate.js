'use strict';

const MASTER_REVENUE_PER_DAY = {
  nails:   { moscow: 24000, region: 12500 },
  hair:    { moscow: 50000, region: 20000 },
  massage: { moscow: 32000, region: 13500 },
  laser:   { moscow: 28000, region: 12000 },
  cosmo:   { moscow: 28000, region: 12000 },
  sugar:   { moscow: 20000, region: 10000 },
  complex: { moscow: 30000, region: 14000 }
};

const NICHE_LABELS = {
  nails:   'Ногти / ресницы / брови',
  hair:    'Парикмахерская / окраска',
  massage: 'Массаж / тело',
  laser:   'Лазерная эпиляция',
  cosmo:   'Косметология / аппаратные процедуры',
  sugar:   'Шугаринг / депиляция',
  complex: 'Комплексный салон'
};

const SEGMENT_LABELS = {
  p1: 'P1 — Горячий (заявка / бронь)',
  p2: 'P2 — Тёплый (был на вебинаре)',
  p3: 'P3 — Средний (купил мини-курс)',
  p4: 'P4 — Холодный (давний)'
};

const MODULE_NAMES = {
  1: 'Финансы и учёт',
  2: 'Маркетинг и привлечение',
  3: 'Продажи и скрипты',
  4: 'Удержание клиентов и CRM',
  5: 'Управление сотрудниками'
};

const WORK_DAYS    = 22;
const ABON_PRICE   = 20000;
const TARGET_LOAD  = 0.65;
const CONSERVATIVE = 0.70;
const NORM_RATE    = 0.20;

function fmtRu(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

function pluralSeats(n) {
  if (n === 1) return 'место';
  if (n >= 2 && n <= 4) return 'места';
  return 'мест';
}

function calculate(input) {
  const { revenue, masters, seats, baseSize, activeClients, niche, city, answers } = input;

  const cityKey      = city === 'moscow' ? 'moscow' : 'region';
  const nicheData    = MASTER_REVENUE_PER_DAY[niche] ?? MASTER_REVENUE_PER_DAY.complex;
  const masterRevDay = nicheData[cityKey];
  const unusedSeats  = Math.max(0, seats - masters);

  // 1. Физический потолок бизнеса
  const ceiling     = masters * WORK_DAYS * masterRevDay;
  const currentLoad = ceiling > 0 ? revenue / ceiling : 0;

  // 2. Потенциал загрузки — только до 65% от потолка
  let loadPotential = 0;
  if (currentLoad < TARGET_LOAD) {
    loadPotential = Math.max(0, ceiling * TARGET_LOAD - revenue);
  }

  // 3. Потенциал незадействованных мест
  const unusedPotential = unusedSeats * masterRevDay * WORK_DAYS * TARGET_LOAD;

  // 4. Потенциал базы — только через разрыв до нормы 20%
  const activeRateFrac  = baseSize > 0 ? activeClients / baseSize : 0;
  const activeRate      = activeRateFrac * 100;
  const sleepingClients = Math.max(0, baseSize - activeClients);
  let basePotential     = 0;
  let additionalClients = 0;
  if (activeRateFrac < NORM_RATE && activeClients > 0 && baseSize > 0) {
    const targetActive    = baseSize * NORM_RATE;
    additionalClients     = targetActive - activeClients;
    const avgCheck        = revenue / activeClients;
    const rawBase         = additionalClients * avgCheck;
    const remainingCap    = ceiling * TARGET_LOAD - revenue - loadPotential;
    basePotential         = Math.min(rawBase, Math.max(0, remainingCap));
  }

  // 5. Потенциал абонементов (быстрые деньги первого месяца)
  const abonCount     = Math.floor(activeClients / 100) * 12;
  const abonPotential = abonCount * ABON_PRICE;

  // 6. Потенциал допродаж
  let upsellPotential = 0;
  if (answers.q_upsell === 'never')     upsellPotential = revenue * 0.12;
  else if (answers.q_upsell === 'sometimes') upsellPotential = revenue * 0.06;

  // 7. Финансовые утечки
  let financePotential = 0;
  if (answers.q_finance === 'no')       financePotential = revenue * 0.10;
  else if (answers.q_finance === 'rough') financePotential = revenue * 0.05;

  // 8. Итог с консервативным коэффициентом
  const grossPotential = loadPotential + unusedPotential + basePotential
                       + upsellPotential + financePotential;
  const totalMonthly   = Math.round(grossPotential * CONSERVATIVE);
  const totalAnnual    = totalMonthly * 12;

  // Строим точки роста
  const points = [];

  if (activeRateFrac < NORM_RATE && basePotential > 0) {
    const avgCheck = revenue / activeClients;
    points.push({
      key:         'base',
      label:       'Реактивация клиентской базы',
      amount:      Math.round(basePotential),
      abonPotential,
      severity:    'critical',
      icon:        '👥',
      description: `Ваша активная база — ${Math.round(activeRate)}% (норма 20%). При системной работе — плюс ${Math.round(additionalClients)} клиентов в месяц = +${fmtRu(Math.round(additionalClients * avgCheck))} ₽`,
      caseText:    '50 звонков по базе → 10 записей → 40–70к в кассу без рекламы',
      moduleId:    4,
      mainPain:    'база'
    });
  }

  if (loadPotential > 0) {
    points.push({
      key:         'load',
      label:       'Недозагрузка рабочих мест',
      amount:      Math.round(loadPotential),
      severity:    currentLoad < 0.50 ? 'critical' : 'important',
      icon:        '📅',
      description: `Загрузка ${Math.round(currentLoad * 100)}% — ниже нормы 65%. При грамотном заполнении расписания — дополнительно +${fmtRu(Math.round(loadPotential))} ₽/мес.`,
      caseText:    'Продлили рабочие часы на 2 часа → +30% к выручке без новых вложений',
      moduleId:    3,
      mainPain:    'загрузка'
    });
  }

  if (unusedPotential > 0) {
    points.push({
      key:         'unused',
      label:       `${unusedSeats} незадействованных рабочих ${pluralSeats(unusedSeats)}`,
      amount:      Math.round(unusedPotential),
      severity:    'important',
      icon:        '🪑',
      description: `Свободные места без мастеров. Каждое при 65% загрузке — +${fmtRu(Math.round(masterRevDay * WORK_DAYS * TARGET_LOAD))} ₽/мес к выручке.`,
      caseText:    'Один правильно нанятый мастер удвоил выручку направления за 6 недель',
      moduleId:    5,
      mainPain:    'персонал'
    });
  }

  if (upsellPotential > 0) {
    points.push({
      key:         'upsell',
      label:       answers.q_upsell === 'never' ? 'Нет допродаж совсем' : 'Допродажи без системы',
      amount:      Math.round(upsellPotential),
      severity:    answers.q_upsell === 'never' ? 'critical' : 'important',
      icon:        '💬',
      description: answers.q_upsell === 'never'
        ? 'Мастера не предлагают доп. услуги. Скрипт допродаж + напоминание администратора = +12% к чеку без новых клиентов.'
        : 'Допродажи по настроению — непредсказуемый результат. Системный скрипт даёт стабильный итог каждый день.',
      caseText:    null,
      moduleId:    3,
      mainPain:    'продажи'
    });
  }

  if (financePotential > 0) {
    points.push({
      key:         'finance',
      label:       answers.q_finance === 'no' ? 'Нет финансового учёта' : 'Неточный финансовый учёт',
      amount:      Math.round(financePotential),
      severity:    answers.q_finance === 'no' ? 'critical' : 'important',
      icon:        '💰',
      description: answers.q_finance === 'no'
        ? 'Без учёта теряется до 10% на скрытых расходах, нецелевых тратах и воровстве. Деньги есть — прибыли нет.'
        : 'Примерный учёт — до 5% потерь. Точные цифры дают контроль и возможность принимать решения.',
      caseText:    'Клиент поймал управляющую на воровстве 100к/мес — окупил обучение за один месяц',
      moduleId:    1,
      mainPain:    'финансы'
    });
  }

  points.sort((a, b) => b.amount - a.amount);
  const growthPoints = points.slice(0, 4);

  const top2Pains = growthPoints.slice(0, 2)
    .map(p => `${p.label}: +${fmtRu(p.amount)} ₽/мес`)
    .join('; ');

  const mainPain = growthPoints[0]?.mainPain ?? 'база';

  return {
    activeRate:      Math.round(activeRate * 10) / 10,
    sleepingClients,
    unusedSeats,
    totalMonthly,
    totalAnnual,
    growthPoints,
    top2Pains,
    abonPotential,
    mainPain,
    nicheLabel:   NICHE_LABELS[niche]          ?? niche,
    segmentLabel: SEGMENT_LABELS[input.segment] ?? input.segment
  };
}

module.exports = { calculate, NICHE_LABELS, SEGMENT_LABELS, MODULE_NAMES };
