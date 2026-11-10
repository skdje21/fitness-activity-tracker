import { useState } from 'react';

const TYPES = ['Бег', 'Ходьба', 'Велосипед', 'Хайкинг', 'Плавание', 'Другое'];

export default function ActivityFormModal({ initial, onClose, onSubmit }) {
    const editing = !!initial;
    const [date, setDate] = useState(initial ? initial.date : '');
    const [type, setType] = useState(initial ? initial.type : 'Бег');
    const [steps, setSteps] = useState(initial ? String(initial.steps) : '');
    const [calories, setCalories] = useState(initial ? String(initial.calories) : '');
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    function validate(fields) {
        const f = { date: fields?.date ?? date, type: fields?.type ?? type, steps: fields?.steps ?? steps, calories: fields?.calories ?? calories };
        const e = {};
        if (!f.date) e.date = 'Обязательное поле';
        if (!f.type) e.type = 'Выберите тип';
        if (f.steps === '') e.steps = 'Обязательное поле';
        else if (Number(f.steps) < 0) e.steps = 'Не может быть отрицательным';
        else if (Number(f.steps) > 200000) e.steps = 'Максимум 200 000';
        if (f.calories === '') e.calories = 'Обязательное поле';
        else if (Number(f.calories) < 0) e.calories = 'Не может быть отрицательным';
        else if (Number(f.calories) > 50000) e.calories = 'Максимум 50 000';
        return e;
    }

    function blur(field) {
        setTouched(t => ({ ...t, [field]: true }));
        setErrors(validate());
    }

    function submit(e) {
        e.preventDefault();
        const allTouched = { date: true, type: true, steps: true, calories: true };
        setTouched(allTouched);
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        onSubmit({ date, type, steps: Number(steps), calories: Number(calories) });
    }

    function fieldErr(name) {
        if (!touched[name] || !errors[name]) return null;
        return <span className="field-error">{errors[name]}</span>;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-form" onClick={(e) => e.stopPropagation()}>
                <h3>{editing ? 'Редактирование активности' : 'Новая активность'}</h3>
                <form className="form" onSubmit={submit} noValidate>
                    <div className="field">
                        <label>Дата</label>
                        <input type="date" value={date} className={touched.date && errors.date ? 'field-invalid' : ''}
                            onChange={(e) => { setDate(e.target.value); if (touched.date) setErrors(validate({ date: e.target.value })); }}
                            onBlur={() => blur('date')} />
                        {fieldErr('date')}
                    </div>
                    <div className="field">
                        <label>Тип активности</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} onBlur={() => blur('type')}>
                            {TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        {fieldErr('type')}
                    </div>
                    <div className="field">
                        <label>Шаги</label>
                        <input type="number" min="0" max="200000" placeholder="0" value={steps}
                            className={touched.steps && errors.steps ? 'field-invalid' : ''}
                            onChange={(e) => { setSteps(e.target.value); if (touched.steps) setErrors(validate({ steps: e.target.value })); }}
                            onBlur={() => blur('steps')} />
                        {fieldErr('steps')}
                    </div>
                    <div className="field">
                        <label>Калории</label>
                        <input type="number" min="0" max="50000" placeholder="0" value={calories}
                            className={touched.calories && errors.calories ? 'field-invalid' : ''}
                            onChange={(e) => { setCalories(e.target.value); if (touched.calories) setErrors(validate({ calories: e.target.value })); }}
                            onBlur={() => blur('calories')} />
                        {fieldErr('calories')}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
                        <button type="submit" className="btn btn-primary">{editing ? 'Сохранить' : '+ Добавить'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
