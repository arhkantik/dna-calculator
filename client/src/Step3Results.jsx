import React from 'react';
import { markLeadClicked } from './api.js';

const MODULE_NAMES = {
  1: 'Финансы и учёт',
  2: 'Маркетинг и привлечение',
  3: 'Продажи и скрипты',
  4: 'Удержание клиентов и CRM',
  5: 'Управление сотрудниками'
};

const MODULE_DETAILS = {
  1: {
    icon:        '📊',
    title:       'Финансы и учёт',
    subtitle:    'Наведите порядок в деньгах за 2 недели',
    description: 'На этом модуле вы разберёте финансовую модель своего бизнеса, найдёте где конкретно утекает прибыль и выстроите управленческий учёт. Ксения разбирает DDS-таблицу, P&L и точку безубыточности — после этого модуля вы будете знать чистую прибыль до копейки и понимать какие расходы реально можно срезать.',
    tools:       ['DDS-таблица', 'P&L', 'Точка безубыточности', 'Финмодель']
  },
  2: {
    icon:        '📣',
    title:       'Маркетинг и привлечение клиентов',
    subtitle:    'Стабильный поток новых клиентов без слива бюджета',
    description: 'Ксения разбирает каналы привлечения которые реально работают в бьюти: геомаркетинг через Яндекс.Карты и 2ГИС, работу с блогерами без переплат, партнёрские программы с соседним бизнесом. Всё это — бесплатные или почти бесплатные инструменты которые дают стабильный поток без зависимости от таргета.',
    tools:       ['Геомаркетинг', 'Блогеры', 'Партнёрки', 'Лид-магниты']
  },
  3: {
    icon:        '💬',
    title:       'Продажи и скрипты',
    subtitle:    'Система продаж которая работает без вас',
    description: 'Ксения даёт готовые скрипты прозвона спящей базы, допродаж на кресле и заполнения расписания через администратора. Разбирает как за 50 звонков по базе получить 10 записей и 40–70 тыс. рублей в кассу без рекламного бюджета. После модуля ваши мастера и администратор продают — а не просто принимают клиентов.',
    tools:       ['Скрипты прозвона', 'Скрипты допродаж', 'Скрипты заполнения расписания']
  },
  4: {
    icon:        '🔄',
    title:       'Удержание клиентов и CRM',
    subtitle:    'Верните спящих клиентов и снизьте % отмен',
    description: 'На этом модуле разбирается как настроить CRM-автоматизацию возврата клиентов, выстроить программу лояльности и создать WOW-точки контакта которые заставляют возвращаться. Отдельный блок — работа с потеряшками: как вернуть тех кто ушёл 3–6 месяцев назад и не дать уйти тем кто на грани.',
    tools:       ['CRM-автоматизация', 'Программа лояльности', 'Реактивация базы']
  },
  5: {
    icon:        '👥',
    title:       'Управление сотрудниками',
    subtitle:    'Выйдите из операционки и масштабируйтесь',
    description: 'Ксения разбирает систему найма которая позволяет брать правильных мастеров с первого раза, схему мотивации (оклад + % с продаж + бонусы) которая заставляет команду продавать и не уходить, и карьерный трек который удерживает лучших людей. После модуля вы знаете как нанять ещё одного мастера и загрузить его за 2–3 недели.',
    tools:       ['Система найма', 'Мотивация ФОТ+%', 'Карьерный трек', 'KPI', 'Регламенты']
  }
};

function fmt(n) {
  return Number(n).toLocaleString('ru-RU');
}

function SevTag({ sev }) {
  const cfg = {
    critical:  { label: 'КРИТИЧНО', cls: 'sev-critical' },
    important: { label: 'ВАЖНО',    cls: 'sev-important' },
    growth:    { label: 'РОСТ',     cls: 'sev-growth' }
  }[sev] || { label: 'ВАЖНО', cls: 'sev-important' };
  return <span className={`sev-tag ${cfg.cls}`}>{cfg.label}</span>;
}

function AkbBar({ activeRate }) {
  const norm   = 20;
  const target = 30;
  const pct    = Math.min((activeRate / target) * 100, 100);
  const normPct  = (norm / target) * 100;
  const isGood = activeRate >= norm;

  return (
    <div>
      <div className="akb-stats">
        <div>
          <span className="akb-value" style={{ color: isGood ? '#27ae60' : '#e74c3c' }}>
            {activeRate}%
          </span>
          <span className="akb-desc"> — ваша активная база (норма рынка 20%)</span>
        </div>
        {!isGood && (
          <p className="akb-comment">
            У других бизнесов мы делаем 30% спокойно — давайте считать минимум
          </p>
        )}
        {isGood && (
          <p className="akb-comment">Хороший показатель — ваша база работает</p>
        )}
      </div>

      <div className="akb-bar-outer">
        <div className={`akb-bar-fill${isGood ? ' good' : ''}`} style={{ width: `${pct}%` }} />
        <div className="akb-marker norm"   style={{ left: `${normPct}%` }} />
        <div className="akb-marker target" style={{ left: '100%' }} />
      </div>

      <div className="akb-legend">
        <div className="akb-legend-item">
          <div className="akb-legend-dot" style={{ background: isGood ? '#27ae60' : '#e74c3c' }} />
          Ваш: {activeRate}%
        </div>
        <div className="akb-legend-item">
          <div className="akb-legend-dot" style={{ background: '#e67e22' }} />
          Норма: {norm}%
        </div>
        <div className="akb-legend-item">
          <div className="akb-legend-dot" style={{ background: '#27ae60' }} />
          Лучший: {target}%
        </div>
      </div>
    </div>
  );
}

function GrowthCard({ point }) {
  return (
    <div className="growth-card">
      <div className="growth-card-header">
        <span className="growth-icon">{point.icon}</span>
        <span className="growth-label">{point.label}</span>
        <SevTag sev={point.severity} />
      </div>
      <p className="growth-desc">{point.description}</p>
      <div className="growth-amount">+{fmt(point.amount)} ₽/мес</div>
      {point.caseText && (
        <div className="growth-case">💬 Кейс: «{point.caseText}»</div>
      )}
      <div className="growth-module">
        📌 Модуль {point.moduleId} — {MODULE_NAMES[point.moduleId]}
      </div>
    </div>
  );
}

function ModuleCard({ moduleId }) {
  const m = MODULE_DETAILS[moduleId];
  if (!m) return null;
  return (
    <div className="module-detail-card">
      <div className="module-detail-header">
        <span className="module-detail-icon">{m.icon}</span>
        <div>
          <div className="module-detail-title">МОДУЛЬ {moduleId} — {m.title}</div>
          <div className="module-detail-subtitle">{m.subtitle}</div>
        </div>
      </div>
      <p className="module-detail-desc">{m.description}</p>
      <div className="module-detail-tools">
        {m.tools.map(t => (
          <span key={t} className="module-tool-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function Step3Results({ results, leadName, onReset, onBooking }) {
  const { formData } = results;
  const baseSize      = formData?.baseSize     || 0;
  const abonPotential = results.abonPotential  || 0;

  // Уникальные moduleId из точек роста, макс 3
  const triggeredModules = [...new Set(
    (results.growthPoints || []).map(p => p.moduleId).filter(Boolean)
  )].slice(0, 3);

  async function handleBooking() {
    let leadId = null;
    if (onBooking) leadId = await onBooking();
    if (leadId) {
      try { await markLeadClicked(leadId); } catch {}
    }
    const username = (import.meta.env.VITE_TG_MANAGER_USERNAME || 'manager').replace('@', '');
    window.open(`https://t.me/${username}?text=ХОЧУ%20РАЗБОР`, '_blank');
  }

  return (
    <div>
      {/* Персональное обращение */}
      {leadName && (
        <div className="results-greeting">
          {leadName}, вот результаты диагностики вашего бизнеса:
        </div>
      )}

      {/* HERO */}
      <div className="hero-block">
        <div className="hero-eyebrow">Скрытый потенциал бизнеса</div>
        <div className="hero-main">
          +{fmt(results.totalMonthly)}<span className="hero-currency"> ₽</span>
        </div>
        <div className="hero-annual">
          {fmt(results.totalAnnual)} ₽ в год
        </div>
        <div className="hero-note">
          Минимальный расчёт. По данным практики Ксении Смирновой реальный результат может быть в 1.5–2 раза выше
        </div>
      </div>

      {/* АКБ */}
      <div className="card">
        <h3>АКБ-диагностика</h3>
        <AkbBar activeRate={results.activeRate} />
      </div>

      {/* Точки роста */}
      {results.growthPoints && results.growthPoints.length > 0 ? (
        <>
          <div className="section-title">Точки роста — куда уходят деньги прямо сейчас</div>
          {results.growthPoints.map((p, i) => <GrowthCard key={i} point={p} />)}
        </>
      ) : (
        <div className="card no-issues">
          <div className="icon">🎉</div>
          <p>По основным метрикам бизнес в хорошей форме. Есть потенциал для масштабирования.</p>
        </div>
      )}

      {/* Карточки модулей */}
      {triggeredModules.length > 0 && (
        <>
          <div className="section-title">Что именно разбирается на курсе по вашим точкам роста:</div>
          {triggeredModules.map(id => <ModuleCard key={id} moduleId={id} />)}
        </>
      )}

      {/* Первый месяц */}
      {abonPotential > 0 && (
        <>
          <div className="section-title">Что даёт курс за первый месяц</div>
          <div className="card highlight-card">
            <p>
              С вашей базой <strong>{fmt(baseSize)} человек</strong> — реально продать{' '}
              <strong>10–20 абонементов по 20 000 ₽</strong> ={' '}
              <span className="money-highlight">200 000–400 000 ₽</span> дополнительно
              уже в первый месяц.
            </p>
            <p className="calc-detail">
              Минимальный расчёт для вашей базы: <strong>+{fmt(abonPotential)} ₽</strong> от реактивации «потеряшек»
            </p>
          </div>
        </>
      )}

      {/* CTA */}
      <div className="cta-block">
        <div className="cta-badge">Бесплатно · Только 3 места в неделю</div>
        <h2 className="cta-title">
          Узнайте, как забрать эти деньги уже в следующем месяце
        </h2>
        <p className="cta-text">
          Эксперт команды Ксении Смирновой разберёт ваш бизнес лично —
          по цифрам, которые вы только что получили.
        </p>

        <div className="cta-bullets">
          <div className="cta-bullet">
            <span className="cta-bullet-icon">✓</span>
            <span>Конкретный план — что делать в первые 30 дней</span>
          </div>
          <div className="cta-bullet">
            <span className="cta-bullet-icon">✓</span>
            <span>Разбор точек роста именно вашего бизнеса, а не общие советы</span>
          </div>
          <div className="cta-bullet">
            <span className="cta-bullet-icon">✓</span>
            <span>Ответы на ваши вопросы — без скриптов и давления</span>
          </div>
        </div>

        <button className="btn-cta" onClick={handleBooking}>
          Записаться на бесплатный разбор →
        </button>
        <div className="cta-fine">
          Разбор занимает 30–40 минут. Бесплатно и без обязательств.
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="btn-primary" style={{ flex: 1 }} onClick={onReset}>
          + Пройти заново
        </button>
      </div>
    </div>
  );
}
