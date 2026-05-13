import React, { useState, useEffect } from 'react';
import { getAdminLeads, updateLeadStatus, updateLeadManager, archiveLead, syncToSheets } from './api.js';

const NICHE_LABELS = {
  nails:   'Ногти/ресницы',
  sugar:   'Шугаринг',
  hair:    'Парикмахерская',
  laser:   'Лазерная',
  cosmo:   'Косметология',
  massage: 'Массаж',
  complex: 'Комплексный'
};

const CITY_LABELS = { moscow: 'Москва/СПб', region: 'Регион' };

const MANAGERS = ['', 'Екатерина', 'Артём'];

const STATUS_OPTIONS = [
  { value: 'new',       label: '🟡 Новый' },
  { value: 'contacted', label: '🔵 Написали' },
  { value: 'scheduled', label: '🟢 Разбор назначен' },
  { value: 'closed',    label: '⚫ Закрыт' }
];

const MODULE_NAMES = {
  1: 'Финансы и учёт',
  2: 'Маркетинг и привлечение',
  3: 'Продажи и скрипты',
  4: 'Удержание клиентов и CRM',
  5: 'Управление сотрудниками'
};

// Все вопросы диагностики с метками и цветовой оценкой ответов
const DIAGNOSTIC_QUESTIONS = [
  {
    key: 'q_base_contact',
    label: 'Работа с клиентской базой',
    options: {
      never:     { label: 'Никогда', color: 'red' },
      sometimes: { label: 'Иногда, без системы', color: 'yellow' },
      system:    { label: 'Есть чёткая система', color: 'green' }
    }
  },
  {
    key: 'q_lost',
    label: 'Потерянные клиенты (3+ мес)',
    options: {
      many:        { label: 'Да, таких большинство', color: 'red' },
      few:         { label: 'Есть, немного', color: 'yellow' },
      almost_none: { label: 'Почти нет, удерживаем', color: 'green' }
    }
  },
  {
    key: 'q_cancels',
    label: '% отмен и переносов',
    options: {
      gt30:    { label: 'Больше 30%', color: 'red' },
      '2030':  { label: '20–30%', color: 'yellow' },
      lt20:    { label: 'Меньше 20%', color: 'green' },
      unknown: { label: 'Не считаю', color: 'red' }
    }
  },
  {
    key: 'q_load',
    label: 'Загрузка рабочих мест',
    options: {
      lt50:  { label: 'Меньше 50% (много простоя)', color: 'red' },
      '5065':{ label: '50–65% (есть окна)', color: 'yellow' },
      '6575':{ label: '65–75% (норма)', color: 'green' },
      gt75:  { label: '75%+ (почти полная)', color: 'green' }
    }
  },
  {
    key: 'q_hire',
    label: 'Найм и удержание мастеров',
    options: {
      crisis: { label: 'Текучка / сложно найти', color: 'red' },
      normal: { label: 'Нормально, но напряжённо', color: 'yellow' },
      stable: { label: 'Команда стабильна', color: 'green' }
    }
  },
  {
    key: 'q_self',
    label: 'Работаете сами руками',
    options: {
      much:      { label: 'Да, большую часть времени', color: 'red' },
      sometimes: { label: 'Иногда, меньше 30%', color: 'yellow' },
      no:        { label: 'Нет, только управление', color: 'green' }
    }
  },
  {
    key: 'q_upsell',
    label: 'Допродажи и скрипты',
    options: {
      never:     { label: 'Никогда', color: 'red' },
      sometimes: { label: 'Иногда, по настроению', color: 'yellow' },
      system:    { label: 'Да, есть скрипты', color: 'green' }
    }
  },
  {
    key: 'q_check',
    label: 'Средний чек vs конкуренты',
    options: {
      below:   { label: 'Ниже рынка / скидки', color: 'red' },
      average: { label: 'Как у всех', color: 'yellow' },
      above:   { label: 'Выше рынка', color: 'green' }
    }
  },
  {
    key: 'q_abonement',
    label: 'Абонементы / курсы процедур',
    options: {
      no:        { label: 'Нет', color: 'red' },
      sometimes: { label: 'Иногда', color: 'yellow' },
      system:    { label: 'Да, системно', color: 'green' }
    }
  },
  {
    key: 'q_finance',
    label: 'Финансовый учёт',
    options: {
      no:    { label: 'Не считаю', color: 'red' },
      rough: { label: 'Примерно представляю', color: 'yellow' },
      yes:   { label: 'Да, точный учёт', color: 'green' }
    }
  },
  {
    key: 'q_costs',
    label: 'Понимание куда уходят деньги',
    options: {
      no:    { label: 'Нет, деньги просто пропадают', color: 'red' },
      rough: { label: 'Примерно', color: 'yellow' },
      yes:   { label: 'Да, всё прозрачно', color: 'green' }
    }
  },
  {
    key: 'q_fot',
    label: 'ФОТ мастеров от выручки',
    options: {
      unknown:  { label: 'Не знаю', color: 'red' },
      above40:  { label: 'Знаю, больше 40%', color: 'red' },
      below40:  { label: 'Знаю, до 40%', color: 'green' }
    }
  },
  {
    key: 'q_traffic',
    label: 'Источники новых клиентов',
    options: {
      word_only: { label: 'Только сарафан', color: 'red' },
      unstable:  { label: '1–2 канала нестабильно', color: 'yellow' },
      system:    { label: 'Несколько каналов системно', color: 'green' }
    }
  },
  {
    key: 'q_newcli',
    label: 'Доволен кол-вом новых клиентов',
    options: {
      few:       { label: 'Нет, катастрофически мало', color: 'red' },
      want_more: { label: 'Хотелось бы больше', color: 'yellow' },
      enough:    { label: 'В целом достаточно', color: 'green' }
    }
  }
];

const PAIN_SEGMENTS = [
  { key: 'база',     label: '👥 База/АКБ',     color: '#fef3c7', text: '#92400e' },
  { key: 'загрузка', label: '📅 Недозагрузка', color: '#dbeafe', text: '#1e40af' },
  { key: 'финансы',  label: '💰 Нет финучёта', color: '#fee2e2', text: '#991b1b' },
  { key: 'продажи',  label: '💬 Нет допродаж', color: '#f3e8ff', text: '#6b21a8' },
];

function getSegments(lead) {
  const answers = JSON.parse(lead.answers || '{}');
  const segs = [];
  if (parseFloat(lead.active_rate_pct) < 20) segs.push('база');
  if (['lt50', '5065'].includes(answers.q_load) || (lead.seats || 0) > (lead.masters || 0)) segs.push('загрузка');
  if (['no', 'rough'].includes(answers.q_finance)) segs.push('финансы');
  if (['never', 'sometimes'].includes(answers.q_upsell)) segs.push('продажи');
  return segs;
}

function SegmentTag({ segKey }) {
  const seg = PAIN_SEGMENTS.find(s => s.key === segKey);
  if (!seg) return null;
  return (
    <span style={{
      background: seg.color, color: seg.text, borderRadius: 4,
      padding: '2px 6px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      display: 'inline-block', marginBottom: 2
    }}>
      {seg.label}
    </span>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString('ru-RU');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function tgHandle(raw) {
  if (!raw) return '';
  const s = raw.trim();
  return s.startsWith('@') ? s.slice(1).toLowerCase() : s.toLowerCase();
}

function normalizeTg(raw) {
  if (!raw) return '';
  const s = raw.trim();
  // phone number — leave as-is
  if (/^[\d\+\-\s()]{7,}$/.test(s)) return s;
  const handle = s.startsWith('@') ? s.slice(1) : s;
  return '@' + handle.toLowerCase();
}

function AnswerBadge({ color, label }) {
  const styles = {
    green:  { background: '#dcfce7', color: '#166534' },
    yellow: { background: '#fef9c3', color: '#854d0e' },
    red:    { background: '#fee2e2', color: '#991b1b' }
  }[color] || { background: '#f3f4f6', color: '#374151' };
  return (
    <span className="answer-badge diag-answer" style={{ ...styles, fontWeight: 600 }}>{label}</span>
  );
}

function LeadDetail({ lead }) {
  const answers     = JSON.parse(lead.answers || '{}');
  const topPains    = JSON.parse(lead.top_pains || '[]');
  const modules     = [...new Set(JSON.parse(lead.modules_triggered || '[]'))];
  const segments    = getSegments(lead);

  return (
    <div className="lead-detail">

      {/* Блок 1 — Базовые данные */}
      <div className="detail-block-title">Базовые данные</div>
      <div className="detail-grid">
        <div><span className="detail-key">Имя</span><span className="detail-val">{lead.name || '—'}</span></div>
        <div><span className="detail-key">Telegram</span>
          <a href={`https://t.me/${tgHandle(lead.telegram)}`} target="_blank" rel="noreferrer" className="tg-link">
            {normalizeTg(lead.telegram) || '—'}
          </a>
        </div>
        <div><span className="detail-key">Ниша</span><span className="detail-val">{NICHE_LABELS[lead.niche] || lead.niche || '—'}</span></div>
        <div><span className="detail-key">Город</span><span className="detail-val">{CITY_LABELS[lead.city] || lead.city || '—'}</span></div>
        <div><span className="detail-key">Выручка/мес</span><span className="detail-val">{fmt(lead.revenue)} ₽</span></div>
        <div><span className="detail-key">Мастеров</span><span className="detail-val">{lead.masters}</span></div>
        <div><span className="detail-key">Рабочих мест</span><span className="detail-val">{lead.seats}</span></div>
        <div><span className="detail-key">Клиентская база</span><span className="detail-val">{fmt(lead.base_size)} чел.</span></div>
        <div><span className="detail-key">Активных клиентов</span><span className="detail-val">{fmt(lead.active_clients)} чел.</span></div>
        <div><span className="detail-key">% АКБ</span><span className="detail-val">{lead.active_rate_pct}%</span></div>
        <div><span className="detail-key">Дата заявки</span><span className="detail-val">{fmtDate(lead.created_at)}</span></div>
        {lead.clicked_tg_at && (
          <div><span className="detail-key">Написал в TG</span><span className="detail-val">{fmtDate(lead.clicked_tg_at)}</span></div>
        )}
      </div>

      {/* Блок 2 — Ответы диагностики */}
      <div className="detail-block-title" style={{ marginTop: 20 }}>Ответы диагностики</div>
      <div className="detail-diagnostic">
        {DIAGNOSTIC_QUESTIONS.map(q => {
          const val = answers[q.key];
          if (!val) return null;
          const opt = q.options[val];
          return (
            <div key={q.key} className="diag-row">
              <span className="diag-question">{q.label}:</span>{' '}
              {opt
                ? <AnswerBadge color={opt.color} label={opt.label} />
                : <span className="answer-badge diag-answer">{val}</span>
              }
            </div>
          );
        })}
      </div>

      {/* Блок 3 — Результаты расчёта */}
      <div className="detail-block-title" style={{ marginTop: 20 }}>Результаты расчёта</div>
      <div className="detail-grid" style={{ marginBottom: 12 }}>
        <div>
          <span className="detail-key">Потенциал/мес</span>
          <span className="detail-val" style={{ color: '#7c3aed', fontWeight: 700 }}>{fmt(lead.potential_monthly)} ₽</span>
        </div>
        <div>
          <span className="detail-key">Потенциал/год</span>
          <span className="detail-val" style={{ color: '#7c3aed', fontWeight: 700 }}>{fmt(lead.potential_annual)} ₽</span>
        </div>
      </div>

      {segments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span className="detail-key">Сегменты боли</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {segments.map(s => <SegmentTag key={s} segKey={s} />)}
          </div>
        </div>
      )}

      {topPains.length > 0 && (
        <div className="detail-pains">
          {topPains.map((p, i) => (
            <div key={i} className="detail-pain-item">
              <span>{p.icon} {p.label}</span>
              <span className="pain-amount">+{fmt(p.amount)} ₽/мес</span>
              {p.moduleId && <span className="pain-module">Модуль {p.moduleId} — {MODULE_NAMES[p.moduleId]}</span>}
            </div>
          ))}
        </div>
      )}

      {modules.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
          Сработавшие модули: {modules.map(m => MODULE_NAMES[m] || `Модуль ${m}`).join(', ')}
        </div>
      )}
    </div>
  );
}

function downloadCSV(leads) {
  const NICHE_L = { nails:'Ногти/ресницы', sugar:'Шугаринг', hair:'Парикмахерская', laser:'Лазерная', cosmo:'Косметология', massage:'Массаж', complex:'Комплексный' };
  const STATUS_L = { new:'Новый', contacted:'Написали', scheduled:'Разбор назначен', closed:'Закрыт' };

  const tgCounts = {};
  leads.forEach(l => { const n = normalizeTg(l.telegram); if (n) tgCounts[n] = (tgCounts[n] || 0) + 1; });
  const dupTgs = new Set(Object.keys(tgCounts).filter(k => tgCounts[k] > 1));

  const headers = ['ID','Дата','Источник','Имя','Telegram','Дубль','Ниша','Город','Выручка','Мастеров','Мест','База','Активных','% АКБ','Потенциал/мес','Потенциал/год','Топ-боль','Сегменты','Менеджер','Статус','Написал в TG'];
  const rows = leads.map(l => {
    const topPains = JSON.parse(l.top_pains || '[]');
    const topPain  = topPains[0] ? `${topPains[0].label}: +${topPains[0].amount} руб` : '';
    const segs = getSegments(l).map(s => PAIN_SEGMENTS.find(p => p.key === s)?.label || s).join('; ');
    const normTg = normalizeTg(l.telegram);
    return [
      l.id,
      fmtDate(l.created_at),
      l.source === 'manager' ? 'Созвон' : 'Лид',
      l.name || '',
      normTg,
      dupTgs.has(normTg) ? 'Да' : 'Нет',
      NICHE_L[l.niche] || l.niche || '',
      l.city === 'moscow' ? 'Москва/СПб' : 'Регион',
      l.revenue || 0,
      l.masters || 0,
      l.seats || 0,
      l.base_size || 0,
      l.active_clients || 0,
      l.active_rate_pct || 0,
      l.potential_monthly || 0,
      l.potential_annual || 0,
      topPain,
      segs,
      l.manager || '',
      STATUS_L[l.status] || l.status || '',
      l.clicked_tg ? 'Да' : 'Нет'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const bom = '﻿';
  const csv = bom + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAdminLeads(showArchived)
      .then(data => { setLeads(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [showArchived]);

  async function handleStatusChange(id, status) {
    await updateLeadStatus(id, status);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  }

  async function handleManagerChange(id, manager) {
    await updateLeadManager(id, manager);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, manager } : l));
  }

  async function handleArchive(id, shouldArchive) {
    await archiveLead(id, shouldArchive);
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  const filteredLeads = sourceFilter === 'all' ? leads : leads.filter(l => l.source === sourceFilter);

  const duplicateTgs = (() => {
    const counts = {};
    leads.forEach(l => { const n = normalizeTg(l.telegram); if (n) counts[n] = (counts[n] || 0) + 1; });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  })();

  const total        = leads.length;
  const newCount     = leads.filter(l => l.status === 'new').length;
  const avgPotential = total > 0
    ? Math.round(leads.reduce((s, l) => s + (l.potential_monthly || 0), 0) / total)
    : 0;
  const katCount   = leads.filter(l => l.manager === 'Екатерина').length;
  const artemCount = leads.filter(l => l.manager === 'Артём').length;

  return (
    <>
      <header className="header">
        <div className="header-logo">ДНК <span>Бизнеса</span> — Заявки</div>
      </header>

      <div className="admin-container">
        <div className="admin-stats">
          <div className="admin-stat">
            <div className="admin-stat-val">{total}</div>
            <div className="admin-stat-label">Всего заявок</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-val">{newCount}</div>
            <div className="admin-stat-label">Новых</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-val">{fmt(avgPotential)} ₽</div>
            <div className="admin-stat-label">Средний потенциал</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-val">{katCount}</div>
            <div className="admin-stat-label">Екатерина</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-val">{artemCount}</div>
            <div className="admin-stat-label">Артём</div>
          </div>
        </div>

        <div className="admin-filter">
          <span className="admin-filter-label">Источник:</span>
          {[
            { value: 'all',     label: 'Все' },
            { value: 'lead',    label: '🔵 Лиды' },
            { value: 'manager', label: '🟢 Созвоны' }
          ].map(f => (
            <button
              key={f.value}
              className={`filter-btn${sourceFilter === f.value ? ' active' : ''}`}
              onClick={() => setSourceFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <button
            className={`filter-btn${showArchived ? ' active' : ''}`}
            onClick={() => { setShowArchived(v => !v); setExpandedId(null); }}
          >
            {showArchived ? '📋 Активные' : '📦 Архив'}
          </button>
          <button
            className="filter-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => downloadCSV(filteredLeads)}
            disabled={filteredLeads.length === 0}
          >
            Скачать CSV
          </button>
          <button
            className="filter-btn"
            style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a' }}
            disabled={syncing || leads.length === 0}
            onClick={async () => {
              setSyncing(true);
              try {
                const res = await syncToSheets();
                alert(`✅ Выгружено ${res.count} лидов в Google Sheets`);
              } catch (e) {
                alert('❌ Ошибка: ' + e.message);
              } finally {
                setSyncing(false);
              }
            }}
          >
            {syncing ? '⏳ Выгружаю...' : '📊 Выгрузить в Sheets'}
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Загружаем заявки...</p>
          </div>
        )}

        {!loading && filteredLeads.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Заявок пока нет
          </div>
        )}

        {!loading && filteredLeads.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Источник</th>
                  <th>Имя</th>
                  <th>Telegram</th>
                  <th>Ниша</th>
                  <th>Выручка</th>
                  <th>Потенциал/мес</th>
                  <th>Топ-боль</th>
                  <th>Сегменты</th>
                  <th>Написал в TG</th>
                  <th>Менеджер</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const topPains  = JSON.parse(lead.top_pains || '[]');
                  const topPain   = topPains[0];
                  const isExpanded = expandedId === lead.id;

                  return (
                    <React.Fragment key={lead.id}>
                      <tr className={isExpanded ? 'row-expanded' : ''}>
                        <td className="admin-date">{fmtDate(lead.created_at)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {lead.source === 'manager' ? '🟢 Созвон' : '🔵 Лид'}
                        </td>
                        <td className="admin-name">{lead.name}</td>
                        <td>
                          <a
                            href={`https://t.me/${tgHandle(lead.telegram)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="tg-link"
                          >
                            {normalizeTg(lead.telegram)}
                          </a>
                          {duplicateTgs.has(normalizeTg(lead.telegram)) && (
                            <span style={{
                              marginLeft: 4, background: '#fef08a', color: '#854d0e',
                              borderRadius: 4, padding: '1px 5px', fontSize: 10,
                              fontWeight: 700, verticalAlign: 'middle'
                            }}>дубль</span>
                          )}
                        </td>
                        <td>{NICHE_LABELS[lead.niche] || lead.niche || '—'}</td>
                        <td>{fmt(lead.revenue)} ₽</td>
                        <td className="admin-potential">{fmt(lead.potential_monthly)} ₽</td>
                        <td className="admin-pain">
                          {topPain ? `${topPain.label}: +${fmt(topPain.amount)} ₽` : '—'}
                        </td>
                        <td>
                          {(() => {
                            const segs = getSegments(lead);
                            return segs.length > 0
                              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {segs.map(s => <SegmentTag key={s} segKey={s} />)}
                                </div>
                              : '—';
                          })()}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 18 }}>
                          {lead.clicked_tg ? '✅' : '—'}
                        </td>
                        <td>
                          <select
                            className="status-select"
                            value={lead.manager || ''}
                            onChange={e => handleManagerChange(lead.id, e.target.value)}
                          >
                            <option value="">Не назначен</option>
                            {MANAGERS.filter(m => m).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="status-select"
                            value={lead.status || 'new'}
                            onChange={e => handleStatusChange(lead.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <a
                              href={`https://t.me/${tgHandle(lead.telegram)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-tg"
                            >
                              Написать в TG
                            </a>
                            <button
                              className="btn-detail"
                              onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                            >
                              {isExpanded ? 'Свернуть' : 'Подробнее'}
                            </button>
                            <button
                              className="btn-detail"
                              onClick={() => window.open(`/admin/print/${lead.id}`, '_blank')}
                            >
                              PDF
                            </button>
                            <button
                              className="btn-archive"
                              onClick={() => handleArchive(lead.id, !showArchived)}
                            >
                              {showArchived ? 'Восстановить' : 'В архив'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="detail-row">
                          <td colSpan={13}>
                            <LeadDetail lead={lead} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
