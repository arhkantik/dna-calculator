import React, { useState } from 'react';

const BLOCKS = [
  {
    title: 'Блок 1 — Клиентская база',
    questions: [
      {
        key: 'q_base_contact',
        text: 'Как часто контактируете с базой (звонки, рассылки, напоминания)?',
        options: [
          { value: 'never',     label: 'Никогда' },
          { value: 'sometimes', label: 'Иногда, без системы' },
          { value: 'system',    label: 'Есть чёткая система' }
        ]
      },
      {
        key: 'q_lost',
        text: 'Много ли клиентов пропало (не приходили 3+ месяца)?',
        options: [
          { value: 'many',        label: 'Да, таких большинство' },
          { value: 'few',         label: 'Есть, немного' },
          { value: 'almost_none', label: 'Почти нет, удерживаем' }
        ]
      },
      {
        key: 'q_cancels',
        text: 'Примерный % отмен и переносов записей:',
        hint: 'Норма рынка 25%. Выше — прямые потери выручки каждый месяц',
        options: [
          { value: 'gt30',    label: 'Больше 30%' },
          { value: '2030',    label: '20–30%' },
          { value: 'lt20',    label: 'Меньше 20%' },
          { value: 'unknown', label: 'Не считаю' }
        ]
      }
    ]
  },
  {
    title: 'Блок 2 — Загрузка и персонал',
    questions: [
      {
        key: 'q_load',
        text: 'Насколько загружены рабочие места?',
        hint: 'Норма по рынку 65–70%. Ниже 50% — потери каждый день',
        options: [
          { value: 'lt50', label: 'Меньше 50% (много простоя)' },
          { value: '5065', label: '50–65% (есть окна)' },
          { value: '6575', label: '65–75% (норма)' },
          { value: 'gt75', label: '75%+ (почти полная)' }
        ]
      },
      {
        key: 'q_hire',
        text: 'Ситуация с наймом и удержанием мастеров:',
        options: [
          { value: 'crisis', label: 'Текучка / сложно найти' },
          { value: 'normal', label: 'Нормально, но напряжённо' },
          { value: 'stable', label: 'Команда стабильна' }
        ]
      },
      {
        key: 'q_self',
        text: 'Вы сами работаете руками (принимаете клиентов)?',
        options: [
          { value: 'much',      label: 'Да, большую часть времени' },
          { value: 'sometimes', label: 'Иногда, меньше 30%' },
          { value: 'no',        label: 'Нет, только управление' }
        ]
      }
    ]
  },
  {
    title: 'Блок 3 — Продажи и чек',
    questions: [
      {
        key: 'q_upsell',
        text: 'Мастера / администратор предлагают доп. услуги или уход?',
        options: [
          { value: 'never',     label: 'Никогда' },
          { value: 'sometimes', label: 'Иногда, по настроению' },
          { value: 'system',    label: 'Да, есть скрипты' }
        ]
      },
      {
        key: 'q_check',
        text: 'Ваш средний чек по сравнению с конкурентами:',
        options: [
          { value: 'below',   label: 'Ниже рынка / работаем со скидками' },
          { value: 'average', label: 'Как у всех' },
          { value: 'above',   label: 'Выше рынка' }
        ]
      },
      {
        key: 'q_abonement',
        text: 'Продаёте абонементы / курсы процедур?',
        options: [
          { value: 'no',        label: 'Нет' },
          { value: 'sometimes', label: 'Иногда' },
          { value: 'system',    label: 'Да, системно' }
        ]
      }
    ]
  },
  {
    title: 'Блок 4 — Финансы',
    questions: [
      {
        key: 'q_finance',
        text: 'Знаете точку безубыточности и чистую прибыль прошлого месяца?',
        options: [
          { value: 'no',    label: 'Нет, не считаю' },
          { value: 'rough', label: 'Примерно представляю' },
          { value: 'yes',   label: 'Да, точный учёт' }
        ]
      },
      {
        key: 'q_costs',
        text: 'Понимаете куда уходят деньги — что съедает прибыль?',
        options: [
          { value: 'no',    label: 'Нет, деньги просто пропадают' },
          { value: 'rough', label: 'Примерно' },
          { value: 'yes',   label: 'Да, всё прозрачно' }
        ]
      },
      {
        key: 'q_fot',
        text: 'Доля зарплаты мастеров от выручки (ФОТ):',
        hint: 'Норма: max 40% для обычных услуг, max 25% для аппаратных / косметологии',
        options: [
          { value: 'unknown',  label: 'Не знаю' },
          { value: 'above40',  label: 'Знаю, больше 40%' },
          { value: 'below40',  label: 'Знаю, до 40%' }
        ]
      }
    ]
  },
  {
    title: 'Блок 5 — Трафик',
    questions: [
      {
        key: 'q_traffic',
        text: 'Откуда в основном приходят новые клиенты:',
        options: [
          { value: 'word_only', label: 'Только сарафан' },
          { value: 'unstable',  label: '1–2 канала нестабильно' },
          { value: 'system',    label: 'Несколько каналов системно' }
        ]
      },
      {
        key: 'q_newcli',
        text: 'Довольны количеством новых клиентов каждый месяц?',
        options: [
          { value: 'few',        label: 'Нет, катастрофически мало' },
          { value: 'want_more',  label: 'Хотелось бы больше' },
          { value: 'enough',     label: 'В целом достаточно' }
        ]
      }
    ]
  }
];

const ALL_KEYS = BLOCKS.flatMap(b => b.questions.map(q => q.key));

export default function Step2Diagnostic({ onNext, onBack, initialAnswers }) {
  const [answers, setAnswers] = useState(initialAnswers || {});
  const [attempted, setAttempted] = useState(false);

  const answered = ALL_KEYS.filter(k => answers[k]);
  const remaining = ALL_KEYS.length - answered.length;

  function pick(key, value) {
    setAnswers(a => ({ ...a, [key]: value }));
  }

  function handleSubmit() {
    setAttempted(true);
    if (remaining > 0) return;
    onNext(answers);
  }

  return (
    <div>
      <button className="btn-back" onClick={onBack}>← Назад</button>

      {BLOCKS.map(block => (
        <div key={block.title}>
          <div className="block-title">{block.title}</div>
          <div className="card">
            {block.questions.map(q => {
              const isUnanswered = attempted && !answers[q.key];
              return (
                <div className="q-block" key={q.key}>
                  <div className="q-title" style={isUnanswered ? { color: '#e74c3c' } : {}}>
                    {q.text}
                  </div>
                  {q.hint && <div className="q-hint">{q.hint}</div>}
                  <div className="q-options">
                    {q.options.map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        className={`q-option${answers[q.key] === opt.value ? ' selected' : ''}`}
                        onClick={() => pick(q.key, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {attempted && remaining > 0 && (
        <div className="error-box">
          Ответьте на все вопросы — осталось {remaining} {remaining === 1 ? 'вопрос' : 'вопроса'}
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        onClick={handleSubmit}
      >
        {remaining === 0
          ? 'Рассчитать потенциал →'
          : `Осталось ${remaining} ${remaining === 1 ? 'вопрос' : 'вопроса'}`}
      </button>
    </div>
  );
}
