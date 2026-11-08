import { useState } from 'react';

const TYPES = ['Бег', 'Ходьба', 'Велосипед', 'Хайкинг', 'Плавание', 'Другое'];

export default function ActivityFormModal({ initial, onClose, onSubmit }) {
    const editing = !!initial;
    const [date, setDate] = useState(initial ? initial.date : '');
    const [type, setType] = useState(initial ? initial.type : 'Бег');
    const [steps, setSteps] = useState(initial ? String(initial.steps) : '');
    const [calories, setCalories] = useState(initial ? String(initial.calories) : '');
    const [error, setError] = useState(null);

    function submit(e) {
        e.preventDefault();
        if (!date || !type || steps === '' || calories === '') {
            setError('Заполните все поля');
            return;
        }
        if (Number(steps) < 0 || Number(calories) < 0) {
            setError('Значения не могут быть отрицательными');
            return;
        }
        onSubmit({ date, type, steps: Number(steps), calories: Number(calories) });
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-form" onClick={(e) => e.stopPropagation()}>
                <h3>{editing ? 'Редактирование активности' : 'Новая активность'}</h3>
                <form className="form" onSubmit={submit}>
                    <div className="field">
                        <label>Дата</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Тип активности</label>
                        <select value={type} onChange={(e) => setType(e.target.value)}>
                            {TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>Шаги</label>
                        <input type="number" min="0" placeholder="0" value={steps} onChange={(e) => setSteps(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Калории</label>
                        <input type="number" min="0" placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
                        <button type="submit" className="btn btn-primary">{editing ? 'Сохранить' : '+ Добавить'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
