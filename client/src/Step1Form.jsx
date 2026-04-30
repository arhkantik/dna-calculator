import React, { useState } from 'react';

const NICHES = [
  { value: 'nails',   label: 'Ногти / ресницы / брови' },
  { value: 'sugar',   label: 'Шугаринг / депиляция' },
  { value: 'hair',    label: 'Парикмахерская / окраска' },
  { value: 'laser',   label: 'Лазерная эпиляция' },
  { value: 'cosmo',   label: 'Косметология / аппаратные процедуры' },
  { value: 'massage', label: 'Массаж / тело' },
  { value: 'complex', label: 'Комплексный салон' }
];

const SEGMENTS = [
  { value: 'p1', label: 'P1 — Горячий (оставил заявку / бронь)' },
  { value: 'p2', label: 'P2 — Тёплый (был на вебинаре)' },
  { value: 'p3', label: 'P3 — Средний (купил мини-курс, не смотрел)' },
  { value: 'p4', label: 'P4 — Холодный (купил давно)' }
];

const EMPTY = {
  leadName:     '',
  niche:        '',
  city:         '',
  bizAge:       '',
  revenue:      '',
  masters:      '',
  seats:        '',
  baseSize:     '',
  activeClients:'',
  segment:      ''
};

function parseNum(s) {
  return parseInt(String(s).replace(/\D/g, ''), 10);
}

export default function Step1Form({ onNext, initialData }) {
  const [data, setData]     = useState(initialData || EMPTY);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setData(d => ({ ...d, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  function validate() {
    const e = {};
    if (!data.leadName.trim())   e.leadName     = 'Введите имя лида';
    if (!data.niche)             e.niche        = 'Выберите направление';
    if (!data.city)              e.city         = 'Выберите город';
    if (!data.bizAge)            e.bizAge       = 'Выберите возраст бизнеса';
    if (!data.segment)           e.segment      = 'Выберите сегмент';

    const rev = parseNum(data.revenue);
    if (!rev || rev <= 0)        e.revenue      = 'Введите выручку больше нуля';

    const m = parseNum(data.masters);
    if (!m || m <= 0)            e.masters      = 'Введите количество мастеров';

    const s = parseNum(data.seats);
    if (!s || s <= 0)            e.seats        = 'Введите количество мест';

    const bs = parseNum(data.baseSize);
    if (!bs || bs <= 0)          e.baseSize     = 'Введите объём базы';

    const ac = parseNum(data.activeClients);
    if (isNaN(ac) || ac < 0)    e.activeClients = 'Введите корректное число';
    else if (ac > bs)            e.activeClients = 'Активных не может быть больше базы';

    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onNext({
      leadName:      data.leadName.trim(),
      niche:         data.niche,
      city:          data.city,
      bizAge:        data.bizAge,
      segment:       data.segment,
      revenue:       parseNum(data.revenue),
      masters:       parseNum(data.masters),
      seats:         parseNum(data.seats),
      baseSize:      parseNum(data.baseSize),
      activeClients: parseNum(data.activeClients)
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="card">
        <h3>Данные лида</h3>

        <div className="form-group">
          <label>Имя лида</label>
          <input
            type="text"
            placeholder="например, Анна Петрова"
            value={data.leadName}
            onChange={e => set('leadName', e.target.value)}
          />
          {errors.leadName && <div className="field-error">{errors.leadName}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Направление бизнеса</label>
            <select value={data.niche} onChange={e => set('niche', e.target.value)}>
              <option value="">Выберите...</option>
              {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            {errors.niche && <div className="field-error">{errors.niche}</div>}
          </div>

          <div className="form-group">
            <label>Город</label>
            <select value={data.city} onChange={e => set('city', e.target.value)}>
              <option value="">Выберите...</option>
              <option value="moscow">Москва / СПб</option>
              <option value="region">Регион</option>
            </select>
            {errors.city && <div className="field-error">{errors.city}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Возраст бизнеса</label>
            <select value={data.bizAge} onChange={e => set('bizAge', e.target.value)}>
              <option value="">Выберите...</option>
              <option value="lt1">До 1 года</option>
              <option value="1-3">1–3 года</option>
              <option value="3+">3+ лет</option>
            </select>
            {errors.bizAge && <div className="field-error">{errors.bizAge}</div>}
          </div>

          <div className="form-group">
            <label>Сегмент лида</label>
            <select value={data.segment} onChange={e => set('segment', e.target.value)}>
              <option value="">Выберите...</option>
              {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {errors.segment && <div className="field-error">{errors.segment}</div>}
          </div>
        </div>

        <div className="form-group">
          <label>Выручка в месяц, ₽</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="например, 450000"
            value={data.revenue}
            onChange={e => set('revenue', e.target.value)}
          />
          {errors.revenue && <div className="field-error">{errors.revenue}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Количество мастеров</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="3"
              value={data.masters}
              onChange={e => set('masters', e.target.value)}
            />
            {errors.masters && <div className="field-error">{errors.masters}</div>}
          </div>

          <div className="form-group">
            <label>Рабочих мест / кресел / кабинетов</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="4"
              value={data.seats}
              onChange={e => set('seats', e.target.value)}
            />
            {errors.seats && <div className="field-error">{errors.seats}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Клиентская база</h3>

        <div className="form-group">
          <label>Объём базы — все клиенты за всё время</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="например, 800"
            value={data.baseSize}
            onChange={e => set('baseSize', e.target.value)}
          />
          {errors.baseSize && <div className="field-error">{errors.baseSize}</div>}
        </div>

        <div className="form-group">
          <label>Активных за последние 3 месяца</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="например, 120"
            value={data.activeClients}
            onChange={e => set('activeClients', e.target.value)}
          />
          <div className="hint">Норма рынка — от 20% активных в базе</div>
          {errors.activeClients && <div className="field-error">{errors.activeClients}</div>}
        </div>
      </div>

      <button type="submit" className="btn-primary">
        Перейти к диагностике →
      </button>
    </form>
  );
}
