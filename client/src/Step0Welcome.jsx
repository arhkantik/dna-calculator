import React, { useState } from 'react';

export default function Step0Welcome({ onNext }) {
  const [name, setName]         = useState('');
  const [telegram, setTelegram] = useState('');
  const [errors, setErrors]     = useState({});

  function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!name.trim())     errs.name     = 'Введите ваше имя';
    if (!telegram.trim()) errs.telegram = 'Введите ваш Telegram';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext({ name: name.trim(), telegram: telegram.trim() });
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <h1>Узнайте, сколько теряет ваш бизнес</h1>
        <p>Пройдите диагностику за 3 минуты — получите план роста выручки</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Ваше имя</label>
            <input
              type="text"
              placeholder="например, Анна"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })); }}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label>Ваш Telegram</label>
            <input
              type="text"
              placeholder="@username"
              value={telegram}
              onChange={e => { setTelegram(e.target.value); setErrors(v => ({ ...v, telegram: '' })); }}
            />
            {errors.telegram && <div className="field-error">{errors.telegram}</div>}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
            Начать диагностику →
          </button>
        </form>
      </div>
    </div>
  );
}
