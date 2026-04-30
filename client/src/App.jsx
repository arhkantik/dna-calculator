import React, { useState } from 'react';
import Step1Form       from './Step1Form.jsx';
import Step2Diagnostic from './Step2Diagnostic.jsx';
import Step3Results    from './Step3Results.jsx';
import History         from './History.jsx';
import { diagnose }    from './api.js';

const STEP_LABELS = ['Данные', 'Диагностика', 'Результат'];

function StepsBar({ step }) {
  return (
    <div>
      <div className="steps-bar">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const cls = num < step ? 'done' : num === step ? 'active' : '';
          return (
            <React.Fragment key={num}>
              {i > 0 && <div className={`step-line${num <= step ? ' done' : ''}`} />}
              <div className={`step-dot ${cls}`}>
                {num < step ? '✓' : num}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 24 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="step-label" style={{ color: i + 1 === step ? '#111' : '#9ca3af', fontWeight: i + 1 === step ? 600 : 400 }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView]         = useState('home'); // 'home' | 'wizard' | 'history'
  const [step, setStep]         = useState(1);
  const [step1Data, setStep1Data] = useState(null);
  const [answers, setAnswers]   = useState({});
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function startNew() {
    setStep(1);
    setStep1Data(null);
    setAnswers({});
    setResults(null);
    setError('');
    setView('wizard');
  }

  function goHistory() {
    setView('history');
  }

  async function handleStep2Submit(ans) {
    setAnswers(ans);
    setLoading(true);
    setError('');
    try {
      const data = await diagnose(step1Data, ans);
      setResults(data);
      setStep(3);
    } catch (e) {
      setError(e.message || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  }

  // Home screen
  if (view === 'home') {
    return (
      <>
        <header className="header">
          <div className="header-logo">ДНК <span>Бизнеса</span> — Диагностика</div>
          <nav className="header-nav">
            <button onClick={goHistory}>История</button>
          </nav>
        </header>
        <div className="container">
          <div className="home-hero">
            <h1>Калькулятор потенциала<br/>бьюти-бизнеса</h1>
            <p>Введите данные клиента — система покажет в рублях,<br/>сколько бизнес теряет прямо сейчас</p>
            <button className="btn-primary" style={{ maxWidth: 320, margin: '0 auto' }} onClick={startNew}>
              Начать диагностику →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 8 }}>
            {[
              { icon: '📊', title: 'Точные расчёты', desc: 'Бенчмарки от эксперта Ксении Смирновой — реальная практика' },
              { icon: '🎯', title: 'Точки роста', desc: 'До 4 конкретных областей с суммами потерь в рублях' },
              { icon: '💬', title: 'Сообщение за секунды', desc: 'Claude AI генерирует WhatsApp-сообщение под каждого клиента' }
            ].map(f => (
              <div className="card" key={f.title} style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // History
  if (view === 'history') {
    return (
      <>
        <header className="header">
          <div className="header-logo">ДНК <span>Бизнеса</span> — Диагностика</div>
          <nav className="header-nav">
            <button className="active" onClick={goHistory}>История</button>
            <button onClick={startNew}>+ Новая</button>
          </nav>
        </header>
        <History onNewDiag={startNew} />
      </>
    );
  }

  // Wizard
  return (
    <>
      <header className="header">
        <div className="header-logo">ДНК <span>Бизнеса</span> — Диагностика</div>
        <nav className="header-nav">
          <button onClick={goHistory}>История</button>
          <button onClick={() => setView('home')}>Главная</button>
        </nav>
      </header>

      <div className="container">
        <StepsBar step={step} />

        {error && <div className="error-box">Ошибка: {error}</div>}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Считаем потенциал и генерируем сообщение...</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Обычно занимает 5–10 секунд</p>
          </div>
        )}

        {!loading && step === 1 && (
          <Step1Form
            initialData={step1Data}
            onNext={data => { setStep1Data(data); setStep(2); }}
          />
        )}

        {!loading && step === 2 && (
          <Step2Diagnostic
            initialAnswers={answers}
            onBack={() => setStep(1)}
            onNext={handleStep2Submit}
          />
        )}

        {!loading && step === 3 && results && (
          <Step3Results
            results={results}
            onReset={startNew}
            onNewDiag={goHistory}
          />
        )}
      </div>
    </>
  );
}
