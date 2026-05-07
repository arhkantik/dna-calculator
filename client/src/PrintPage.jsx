import React, { useState, useEffect } from 'react';
import Step3Results from './Step3Results.jsx';
import { getLeadResults } from './api.js';

export default function PrintPage() {
  const [results, setResults] = useState(null);
  const [error, setError]     = useState('');

  const id = window.location.pathname.split('/').pop();

  useEffect(() => {
    if (!id) return;
    getLeadResults(id)
      .then(data => {
        setResults(data);
        setTimeout(() => window.print(), 300);
      })
      .catch(err => setError(err.message || 'Ошибка загрузки данных'));
  }, [id]);

  if (error) return (
    <div style={{ padding: 40, color: '#991b1b', fontFamily: 'sans-serif' }}>
      Ошибка: {error}
    </div>
  );

  if (!results) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div className="spinner" />
      <p>Загружаем результаты...</p>
    </div>
  );

  const leadName = results.formData?.leadName || '';

  return (
    <div className="print-page container">
      <div className="print-header">
        <div className="header-logo">ДНК <span>Бизнеса</span> — Диагностика</div>
        {leadName && <div className="print-subtitle">Результаты для: {leadName}</div>}
      </div>
      <Step3Results
        results={results}
        leadName={leadName}
        mode="manager"
        onReset={null}
        onBooking={null}
      />
    </div>
  );
}
