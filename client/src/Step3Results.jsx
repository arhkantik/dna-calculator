import React from 'react';

const MODULE_NAMES = {
  1: 'Финансы и учёт',
  2: 'Маркетинг и привлечение',
  3: 'Продажи и скрипты',
  4: 'Удержание клиентов и CRM',
  5: 'Управление сотрудниками'
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

export default function Step3Results({ results, leadName, onReset, onBooking }) {
  const { formData } = results;
  const baseSize     = formData?.baseSize     || 0;
  const abonPotential = results.abonPotential || 0;

  function handleBooking() {
    const username = (import.meta.env.VITE_TG_MANAGER_USERNAME || 'manager').replace('@', '');
    window.open(`https://t.me/${username}?text=ХОЧУ%20РАЗБОР`, '_blank');
    if (onBooking) onBooking();
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

      {/* CTA — призыв на разбор */}
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
