import React, { useState } from 'react';
import Step0Welcome   from './Step0Welcome.jsx';
import Step1Form      from './Step1Form.jsx';
import Step2Diagnostic from './Step2Diagnostic.jsx';
import Step3Results   from './Step3Results.jsx';
import AdminPage      from './AdminPage.jsx';
import { diagnose, saveLead } from './api.js';

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
          <div
            key={i}
            className="step-label"
            style={{
              color:      i + 1 === step ? '#111' : '#9ca3af',
              fontWeight: i + 1 === step ? 600 : 400
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Detect admin route
const IS_ADMIN = typeof window !== 'undefined' && window.location.pathname === '/admin';

export default function App() {
  if (IS_ADMIN) return <AdminPage />;

  const [step, setStep]         = useState(0); // 0=welcome, 1=form, 2=diagnostic, 3=results
  const [leadData, setLeadData] = useState(null); // { name, telegram }
  const [step1Data, setStep1Data] = useState(null);
  const [answers, setAnswers]   = useState({});
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function handleWelcomeNext(data) {
    setLeadData(data);
    setStep(1);
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

  async function handleBooking() {
    if (!results || !leadData) return;
    try {
      await saveLead({
        name:             leadData.name,
        telegram:         leadData.telegram,
        niche:            step1Data.niche,
        city:             step1Data.city,
        revenue:          step1Data.revenue,
        masters:          step1Data.masters,
        seats:            step1Data.seats,
        baseSize:         step1Data.baseSize,
        activeClients:    step1Data.activeClients,
        activeRatePct:    results.activeRate,
        answers,
        potentialMonthly: results.totalMonthly,
        potentialAnnual:  results.totalAnnual,
        topPains: (results.growthPoints || []).map(p => ({
          label:    p.label,
          amount:   p.amount,
          icon:     p.icon,
          moduleId: p.moduleId
        })),
        modulesTriggered: (results.growthPoints || []).map(p => p.moduleId)
      });
    } catch (e) {
      console.error('Save lead error:', e);
    }
  }

  function startOver() {
    setStep(0);
    setLeadData(null);
    setStep1Data(null);
    setAnswers({});
    setResults(null);
    setError('');
  }

  return (
    <>
      <header className="header">
        <div className="header-logo">ДНК <span>Бизнеса</span> — Диагностика</div>
      </header>

      {/* Welcome screen — no container padding, no steps bar */}
      {step === 0 && (
        <Step0Welcome onNext={handleWelcomeNext} />
      )}

      {step >= 1 && (
        <div className="container">
          {step < 3 && <StepsBar step={step} />}

          {error && <div className="error-box">Ошибка: {error}</div>}

          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Считаем потенциал...</p>
            </div>
          )}

          {!loading && step === 1 && (
            <Step1Form
              initialData={step1Data || { leadName: leadData?.name || '' }}
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
              leadName={step1Data?.leadName || leadData?.name || ''}
              onReset={startOver}
              onBooking={handleBooking}
            />
          )}
        </div>
      )}
    </>
  );
}
