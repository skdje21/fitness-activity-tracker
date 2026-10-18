import { useState, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import './App.css';

// === Шаг 1. Форма данных: { id, date, type, steps, calories } ===
const INITIAL = [
    { id: 1, date: '2026-10-01', type: 'Бег', steps: 8200, calories: 420 },
    { id: 2, date: '2026-10-02', type: 'Ходьба', steps: 6100, calories: 315 },
];

function App() {
    // === Шаг 5. Массив хранится в localStorage ===
    const [activities, setActivities] = useLocalStorage('activities', INITIAL);

    // === Шаг 2. Состояние формы и управления ===
    const [date, setDate] = useState('');
    const [type, setType] = useState('');
    const [steps, setSteps] = useState('');
    const [calories, setCalories] = useState('');
    const [editId, setEditId] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [deleteId, setDeleteId] = useState(null); // id записи, ожидающей подтверждения удаления

    // === Шаг 7.2. Имитация загрузки с сервера (1 сек) ===
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // === Шаг 7.1. Заголовок вкладки = количество записей ===
    useEffect(() => {
        document.title = `Активности (${activities.length})`;
    }, [activities]);

    function resetForm() {
        setDate(''); setType(''); setSteps(''); setCalories(''); setEditId(null);
    }

    // === Шаг 3. CRUD ===
    function handleSubmit(e) {
        e.preventDefault();
        if (!date || !type || steps === '' || calories === '') return;

        if (editId === null) {
            const newItem = {
                id: Date.now(),
                date,
                type,
                steps: Number(steps),
                calories: Number(calories),
            };
            setActivities(prev => [...prev, newItem]);
        } else {
            setActivities(prev => prev.map(a =>
                a.id === editId
                    ? { ...a, date, type, steps: Number(steps), calories: Number(calories) }
                    : a
            ));
        }
        resetForm();
    }

    function handleEdit(a) {
        setEditId(a.id);
        setDate(a.date);
        setType(a.type);
        setSteps(String(a.steps));
        setCalories(String(a.calories));
    }

    // Delete — открываем модальное окно подтверждения
    function handleDelete(id) {
        setDeleteId(id);
    }

    // Подтверждение удаления в модальном окне
    function confirmDelete() {
        setActivities(prev => prev.filter(a => a.id !== deleteId));
        if (editId === deleteId) resetForm();
        setDeleteId(null);
    }

    function cancelDelete() {
        setDeleteId(null);
    }

    // === Шаг 6. Производный список: фильтр + сортировка ===
    const visible = activities
        .filter(a => a.type.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'date') return a.date.localeCompare(b.date);
            if (sortBy === 'steps') return b.steps - a.steps;
            if (sortBy === 'calories') return b.calories - a.calories;
            return 0;
        });

    // === Шаг 7.4. Статистика ===
    const totalSteps = activities.reduce((sum, a) => sum + a.steps, 0);
    const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);

    // Запись, ожидающая подтверждения удаления (для модального окна)
    const pendingItem = activities.find(a => a.id === deleteId);

    // === Шаг 7.2. Экран загрузки ===
    if (loading) {
        return (
            <div className="app">
                <div className="loader">
                    <div className="spinner"></div>
                    <p>Загрузка данных…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="header">
                <div className="logo">🏃</div>
                <div>
                    <h1>Трекер физической активности</h1>
                    <p className="subtitle">Учёт тренировок: шаги и калории</p>
                </div>
            </header>

            {/* Статистика (Шаг 7.4) */}
            <section className="stats">
                <div className="stat-card">
                    <span className="stat-value">{activities.length}</span>
                    <span className="stat-label">Записей</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{totalSteps.toLocaleString('ru-RU')}</span>
                    <span className="stat-label">Всего шагов</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{totalCalories.toLocaleString('ru-RU')}</span>
                    <span className="stat-label">Всего калорий</span>
                </div>
            </section>

            {/* Форма (Шаги 3, 4) */}
            <section className={'card form-card ' + (editId !== null ? 'editing' : '')}>
                <h2>{editId === null ? 'Новая запись' : 'Редактирование записи'}</h2>
                <form className="form" onSubmit={handleSubmit}>
                    <div className="field">
                        <label>Дата</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Тип активности</label>
                        <input type="text" placeholder="Бег, Ходьба…" value={type} onChange={e => setType(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Шаги</label>
                        <input type="number" min="0" placeholder="0" value={steps} onChange={e => setSteps(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Калории</label>
                        <input type="number" min="0" placeholder="0" value={calories} onChange={e => setCalories(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {editId === null ? '+ Добавить' : 'Сохранить'}
                        </button>
                        {editId !== null && (
                            <button type="button" className="btn btn-ghost" onClick={resetForm}>Отмена</button>
                        )}
                    </div>
                </form>
            </section>

            {/* Список (Шаг 6 + Read) */}
            <section className="card">
                <div className="controls">
                    <div className="search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Поиск по типу…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="date">Сортировка: по дате</option>
                        <option value="steps">Сортировка: по шагам ↓</option>
                        <option value="calories">Сортировка: по калориям ↓</option>
                    </select>
                </div>

                {visible.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">📭</div>
                        <p>Записей не найдено</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Дата</th><th>Тип</th>
                                <th className="num">Шаги</th><th className="num">Калории</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(a => (
                                <tr key={a.id}>
                                    <td>{a.date}</td>
                                    <td><span className="badge">{a.type}</span></td>
                                    <td className="num">{a.steps.toLocaleString('ru-RU')}</td>
                                    <td className="num">{a.calories.toLocaleString('ru-RU')}</td>
                                    <td className="actions">
                                        <button className="icon-btn" title="Редактировать" onClick={() => handleEdit(a)}>✎</button>
                                        <button className="icon-btn danger" title="Удалить" onClick={() => handleDelete(a.id)}>🗑</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <footer className="footer">Лабораторная работа №4 · React · localStorage</footer>

            {/* Модальное окно подтверждения удаления */}
            {deleteId !== null && (
                <div className="modal-overlay" onClick={cancelDelete}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon">🗑</div>
                        <h3>Удалить запись?</h3>
                        <p className="modal-text">
                            Запись «{pendingItem?.type}» за {pendingItem?.date} будет удалена безвозвратно.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={cancelDelete}>Отмена</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Удалить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
