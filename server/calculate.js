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

const WORK_DAYS       = 22;
const ABON_PRICE      = 20000;
const ABON_PER_100    = 15;
const CONSERVATIVE    = 0.70;
const NORM_AKB        = 20;
const TARGET_LOAD     = 0.70;

function getLoadValue(ans) {
  return { lt50: 0.45, '5065': 0.575, '6575': 0.70, gt75: 0.80 }[ans] ?? 0.575;
}

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

  const activeRate      = baseSize > 0 ? (activeClients / baseSize) * 100 : 0;
  const sleepingClients = Math.max(0, baseSize - activeClients);
  const cityKey         = city === 'moscow' ? 'moscow' : 'region';
  const nicheData       = MASTER_REVENUE_PER_DAY[niche] ?? MASTER_REVENUE_PER_DAY.complex;
  const masterRevDay    = nicheData[cityKey];
  const potPerMaster    = masterRevDay * WORK_DAYS;
  const unusedSeats     = Math.max(0, seats - masters);
  const currentLoad     = getLoadValue(answers.q_load);

  const points = [];

  // 1. Реактивация базы
  if (activeRate < NORM_AKB) {
    const abonPotential      = Math.floor(sleepingClients / 100) * ABON_PER_100 * ABON_PRICE;
    const monthlyBasePotential = Math.round(revenue * 0.20);
    const amount             = Math.max(abonPotential, monthlyBasePotential);

    points.push({
      key:        'base',
      label:      'Реактивация клиентской базы',
      amount,
      abonPotential,
      severity:   'critical',
      icon:       '👥',
      description: `Ваша активная база — ${Math.round(activeRate)}% при норме рынка 20%. ${fmtRu(sleepingClients)} клиентов не приходили 3+ месяца — каждый день это деньги у конкурентов.`,
      caseText:   '50 звонков по базе → 10 записей → 40–70к в кассу без рекламы',
      moduleId:   4,
      mainPain:   'база'
    });
  }

  // 2. Недозагрузка рабочих мест
  if (currentLoad < TARGET_LOAD) {
    const loadGap = Math.round(potPerMaster * (TARGET_LOAD - currentLoad) * seats);
    if (loadGap > 0) {
      points.push({
        key:        'load',
        label:      'Недозагрузка рабочих мест',
        amount:     loadGap,
        severity:   currentLoad < 0.50 ? 'critical' : 'important',
        icon:       '📅',
        description: `Загрузка ниже нормы 70%. При грамотном заполнении расписания — дополнительно +${fmtRu(loadGap)} ₽/мес прямо сейчас.`,
        caseText:   'Продлили рабочие часы на 2 часа → +30% к выручке без новых вложений',
        moduleId:   3,
        mainPain:   'загрузка'
      });
    }
  }

  // 3. Незадействованные места
  if (unusedSeats > 0) {
    const amount = Math.round(unusedSeats * potPerMaster * TARGET_LOAD);
    points.push({
      key:        'unused',
      label:      `${unusedSeats} незадействованных рабочих ${pluralSeats(unusedSeats)}`,
      amount,
      severity:   'important',
      icon:       '🪑',
      description: `Свободные места без мастеров. Каждое при 70% загрузке — +${fmtRu(Math.round(potPerMaster * TARGET_LOAD))} ₽/мес к выручке.`,
      caseText:   'Один правильно нанятый мастер удвоил выручку направления за 6 недель',
      moduleId:   5,
      mainPain:   'персонал'
    });
  }

  // 4. Допродажи
  if (answers.q_upsell === 'never' || answers.q_upsell === 'sometimes') {
    const amount = Math.round(revenue * 0.15);
    points.push({
      key:        'upsell',
      label:      answers.q_upsell === 'never' ? 'Нет допродаж совсем' : 'Допродажи без системы',
      amount,
      severity:   answers.q_upsell === 'never' ? 'critical' : 'important',
      icon:       '💬',
      description: answers.q_upsell === 'never'
        ? 'Мастера не предлагают доп. услуги. Скрипт допродаж + напоминание администратора = +15% к чеку без новых клиентов.'
        : 'Допродажи по настроению — непредсказуемый результат. Системный скрипт даёт стабильный итог каждый день.',
      caseText:   null,
      moduleId:   3,
      mainPain:   'продажи'
    });
  }

  // 5. Отмены
  if (answers.q_cancels === 'gt30' || answers.q_cancels === 'unknown') {
    const amount = Math.round(revenue * 0.08);
    points.push({
      key:        'cancels',
      label:      'Высокий % отмен и переносов',
      amount,
      severity:   'important',
      icon:       '❌',
      description: answers.q_cancels === 'unknown'
        ? 'Не считаете отмены — значит не управляете ими. Норма рынка 25%, если выше — теряете деньги каждый день.'
        : 'Отмены выше 30% — минимум 8% выручки уходит в воздух каждый месяц. CRM-автоматика и депозиты это исправляют.',
      caseText:   null,
      moduleId:   4,
      mainPain:   'удержание'
    });
  }

  // 6. Финансы
  if (answers.q_finance === 'no' || answers.q_finance === 'rough') {
    const amount = Math.round(revenue * (answers.q_finance === 'no' ? 0.15 : 0.08));
    points.push({
      key:        'finance',
      label:      answers.q_finance === 'no' ? 'Нет финансового учёта' : 'Неточный финансовый учёт',
      amount,
      severity:   answers.q_finance === 'no' ? 'critical' : 'important',
      icon:       '💰',
      description: answers.q_finance === 'no'
        ? 'Без учёта теряется до 15% на скрытых расходах, нецелевых тратах и воровстве. Деньги есть — прибыли нет.'
        : 'Примерный учёт — до 8% потерь. Точные цифры дают контроль и возможность принимать решения.',
      caseText:   'Клиент поймал управляющую на воровстве 100к/мес — окупил обучение за один месяц',
      moduleId:   1,
      mainPain:   'финансы'
    });
  }

  // Сортировка по сумме, топ-4
  points.sort((a, b) => b.amount - a.amount);
  const growthPoints = points.slice(0, 4);

  const rawTotal     = points.reduce((s, p) => s + p.amount, 0);
  const totalMonthly = Math.round(rawTotal * CONSERVATIVE);
  const totalAnnual  = totalMonthly * 12;

  const top2Pains = growthPoints.slice(0, 2)
    .map(p => `${p.label}: +${fmtRu(p.amount)} ₽/мес`)
    .join('; ');

  const abonPotential = points.find(p => p.key === 'base')?.abonPotential ?? 0;
  const mainPain      = growthPoints[0]?.mainPain ?? 'база';

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
    nicheLabel:   NICHE_LABELS[niche]     ?? niche,
    segmentLabel: SEGMENT_LABELS[input.segment] ?? input.segment
  };
}

module.exports = { calculate, NICHE_LABELS, SEGMENT_LABELS, MODULE_NAMES };
