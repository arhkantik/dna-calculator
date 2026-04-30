import React, { useEffect, useState } from 'react';
import { getHistory, getDiagnostic } from './api.js';
import Step3Results from './Step3Results.jsx';

const NICHE_LABELS = {
  nails:   'Ногти / ресницы / брови',
  hair:    'Парикмахерская / окраска',
  massage: 'Массаж / тело',
  laser:   'Лазерная эпиляция',
  cosmo:   'Косметология / аппаратные процедуры',
  sugar:   'Шугаринг / депиляция',
  complex: 'Комплексный салон'
};

function fmt(n) { return Number(n).toLocaleString('ru-RU'); }

function fmtDate(s) {
  const d = new Date(s);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function History({ onNewDiag }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null);
  const [detailLoad, setDetailLoad] = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    getHistory()
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function openDiagnostic(id) {
    setDetailLoad(true);
    try {
      const data = await getDiagnostic(id);
      setDetail(data);
    } catch (e) {
      alert('Ошибка загрузки: ' + e.message);
    } finally {
      setDetailLoad(false);
    }
  }

  async function copyMessage(msg, e) {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(msg); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (detailLoad) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Загрузка диагностики...</p>
        </div>
      </div>
    );
  }

  if (detail) {
    return (
      <div className="container">
        <div style={{ marginBottom: 16 }}>
          <button className="btn-back" onClick={() => setDetail(null)}>
            ← Назад к истории
          </button>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
            Диагностика: <strong>{detail.leadName}</strong>
          </div>
        </div>
        <Step3Results
          results={detail}
          onReset={onNewDiag}
          onNewDiag={() => setDetail(null)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Загрузка истории...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="history-header">
        <h2>История диагностик</h2>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={onNewDiag}>
          + Новая
        </button>
      </div>

      {list.length === 0 ? (
        <div className="history-empty">
          <p style={{ fontSize: 40 }}>📋</p>
          <p>История пуста. Создайте первую диагностику.</p>
          <button className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={onNewDiag}>
            Создать диагностику
          </button>
        </div>
      ) : (
        list.map(item => (
          <div className="history-item" key={item.id}>
            <div className="history-info">
              <div className="history-name">{item.lead_name}</div>
              <div className="history-meta">
                {NICHE_LABELS[item.niche] || item.niche}
                {' · '}
                {fmt(item.revenue)} ₽/мес
                {' · '}
                {fmtDate(item.created_at)}
              </div>
            </div>
            <div className="history-potential">
              +{fmt(item.total_potential_monthly)} ₽
            </div>
            <div className="history-actions">
              <button
                className="btn-secondary"
                style={{ fontSize: 13, padding: '7px 14px' }}
                onClick={() => openDiagnostic(item.id)}
              >
                Открыть
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
