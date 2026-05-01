import React, { useState, useEffect } from 'react';
import { getAdminLeads, updateLeadStatus } from './api.js';

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
  return raw.startsWith('@') ? raw.slice(1) : raw;
}

export default function AdminPage() {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    getAdminLeads()
      .then(data => { setLeads(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleStatusChange(id, status) {
    await updateLeadStatus(id, status);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  }

  const total      = leads.length;
  const newCount   = leads.filter(l => l.status === 'new').length;
  const avgPotential = total > 0
    ? Math.round(leads.reduce((s, l) => s + (l.potential_monthly || 0), 0) / total)
    : 0;

  return (
    <>
      <header className="header">
        <div className="header-logo">ДНК <span>Бизнеса</span> — Заявки</div>
      </header>

      <div className="admin-container">
        {/* Stats banner */}
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
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Загружаем заявки...</p>
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Заявок пока нет
          </div>
        )}

        {!loading && leads.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Имя</th>
                  <th>Telegram</th>
                  <th>Ниша</th>
                  <th>Выручка</th>
                  <th>Потенциал/мес</th>
                  <th>Топ-боль</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const topPains = JSON.parse(lead.top_pains || '[]');
                  const topPain  = topPains[0];
                  const isExpanded = expandedId === lead.id;

                  return (
                    <React.Fragment key={lead.id}>
                      <tr className={isExpanded ? 'row-expanded' : ''}>
                        <td className="admin-date">{fmtDate(lead.created_at)}</td>
                        <td className="admin-name">{lead.name}</td>
                        <td>
                          <a
                            href={`https://t.me/${tgHandle(lead.telegram)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="tg-link"
                          >
                            {lead.telegram}
                          </a>
                        </td>
                        <td>{NICHE_LABELS[lead.niche] || lead.niche || '—'}</td>
                        <td>{fmt(lead.revenue)} ₽</td>
                        <td className="admin-potential">{fmt(lead.potential_monthly)} ₽</td>
                        <td className="admin-pain">
                          {topPain ? `${topPain.label}: +${fmt(topPain.amount)} ₽` : '—'}
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
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="detail-row">
                          <td colSpan={9}>
                            <div className="lead-detail">
                              <div className="detail-grid">
                                <div><b>Ниша:</b> {NICHE_LABELS[lead.niche] || lead.niche}</div>
                                <div><b>Город:</b> {CITY_LABELS[lead.city] || lead.city}</div>
                                <div><b>Выручка:</b> {fmt(lead.revenue)} ₽</div>
                                <div><b>Мастеров:</b> {lead.masters}</div>
                                <div><b>Мест:</b> {lead.seats}</div>
                                <div><b>База:</b> {fmt(lead.base_size)} чел.</div>
                                <div><b>Активных:</b> {lead.active_clients} ({lead.active_rate_pct}%)</div>
                                <div><b>Потенциал/мес:</b> {fmt(lead.potential_monthly)} ₽</div>
                                <div><b>Потенциал/год:</b> {fmt(lead.potential_annual)} ₽</div>
                              </div>

                              {topPains.length > 0 && (
                                <div className="detail-section">
                                  <b>Точки роста:</b>
                                  <div className="detail-pains">
                                    {topPains.map((p, i) => (
                                      <div key={i} className="detail-pain-item">
                                        {p.icon} {p.label}:
                                        <span className="pain-amount"> +{fmt(p.amount)} ₽/мес</span>
                                        {p.moduleId && (
                                          <span className="pain-module"> — {MODULE_NAMES[p.moduleId]}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(() => {
                                const modules = JSON.parse(lead.modules_triggered || '[]');
                                return modules.length > 0 ? (
                                  <div className="detail-section">
                                    <b>Модули:</b>{' '}
                                    {modules.map(m => MODULE_NAMES[m] || `Модуль ${m}`).join(', ')}
                                  </div>
                                ) : null;
                              })()}

                              {(() => {
                                const answers = JSON.parse(lead.answers || '{}');
                                const keys = Object.keys(answers);
                                return keys.length > 0 ? (
                                  <div className="detail-section">
                                    <b>Ответы диагностики:</b>
                                    <div className="detail-answers">
                                      {keys.map(k => (
                                        <span key={k} className="answer-badge">{k}: {answers[k]}</span>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
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
