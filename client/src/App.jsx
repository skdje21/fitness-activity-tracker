import { useState, useEffect } from 'react';
import { fetchActivities, addActivity, updateActivity, deleteActivity } from './api';
import './App.css';

function App() {
    // === Основные данные и состояния загрузки/ошибки (Часть 3) ===
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);   // индикатор первой загрузки
    const [error, setError] = useState(null);       // ошибка загрузки списка
    const [notice, setNotice] = useState(null);     // всплывающее уведомление об ошибке операции

    // Поля формы
    const [date, setDate] = useState('');
    const [type, setType] = useState('');
    const [steps, setSteps] = useState('');
    const [calories, setCalories] = useState('');
    const [editId, setEditId] = useState(null);

    // Поиск и сортировка
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date');

    // id записи, ожидающей подтверждения удаления
    const [deleteId, setDeleteId] = useState(null);

    // === Загрузка данных с сервера ===
    async function loadData(searchTerm = '') {
        try {
            setError(null);
            const res = await fetchActivities(searchTerm);
            setActivities(res.data);
        } catch (e) {
            setError('Не удалось загрузить данные. Проверьте, запущен ли сервер.');
        } finally {
            setLoading(false);
        }
    }

    // === Часть 3 + Часть 5: первая загрузка + поиск на сервере с debounce ===
    // Эффект срабатывает при монтировании (search='') и при каждом изменении search.
    // setTimeout + очистка в return = debounce: запрос уходит через 400 мс после паузы в наборе.
    useEffect(() => {
        const timer = setTimeout(() => loadData(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Заголовок вкладки = количество записей
    useEffect(() => {
        document.title = `Активности (${activities.length})`;
    }, [activities]);

    // Автоскрытие уведомления через 3 секунды
    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 3000);
        return () => clearTimeout(timer);
    }, [notice]);

    function resetForm() {
        setDate(''); setType(''); setSteps(''); setCalories(''); setEditId(null);
    }

    // === Часть 4: CRUD с оптимистичным обновлением ===
    async function handleSubmit(e) {
        e.preventDefault();
        if (!date || !type || steps === '' || calories === '') return;

        const payload = { date, type, steps: Number(steps), calories: Number(calories) };

        if (editId === null) {
            // --- ДОБАВЛЕНИЕ ---
            const tempId = Date.now();
            const optimistic = { id: tempId, ...payload };
            setActivities(prev => [...prev, optimistic]); // 1) сразу показываем в списке
            resetForm();
            try {
                const res = await addActivity(payload);                 // 2) POST на сервер
                setActivities(prev => prev.map(a => a.id === tempId ? res.data : a)); // 3) меняем временный id на реальный
            } catch (err) {
                setActivities(prev => prev.filter(a => a.id !== tempId)); // 4) при ошибке убираем элемент
                setNotice('Не удалось добавить запись');
            }
        } else {
            // --- РЕДАКТИРОВАНИЕ ---
            const id = editId;
            const prevItem = activities.find(a => a.id === id);          // запоминаем для отката
            const updatedItem = { ...prevItem, ...payload };
            setActivities(prev => prev.map(a => a.id === id ? updatedItem : a)); // 1) оптимистично обновляем
            resetForm();
            try {
                const res = await updateActivity(id, payload);          // 2) PUT на сервер
                setActivities(prev => prev.map(a => a.id === id ? res.data : a)); // 3) синхронизируем с ответом
            } catch (err) {
                setActivities(prev => prev.map(a => a.id === id ? prevItem : a)); // 4) откат при ошибке
                setNotice('Не удалось обновить запись');
            }
        }
    }

    function handleEdit(a) {
        setEditId(a.id);
        setDate(a.date);
        setType(a.type);
        setSteps(String(a.steps));
        setCalories(String(a.calories));
    }

    function handleDelete(id) {
        setDeleteId(id);
    }

    // --- УДАЛЕНИЕ (оптимистичное) ---
    async function confirmDelete() {
        const id = deleteId;
        const prevItem = activities.find(a => a.id === id); // запоминаем для возврата
        setActivities(prev => prev.filter(a => a.id !== id)); // 1) сразу убираем из списка
        if (editId === id) resetForm();
        setDeleteId(null);
        try {
            await deleteActivity(id);                          // 2) DELETE на сервер
        } catch (err) {
            setActivities(prev => [...prev, prevItem]);         // 3) при ошибке возвращаем обратно
            setNotice('Не удалось удалить запись');
        }
    }

    function cancelDelete() {
        setDeleteId(null);
    }

    // Сортировка на клиенте (поиск выполняется на сервере)
    const visible = [...activities].sort((a, b) => {
        if (sortBy === 'date') return a.date.localeCompare(b.date);
        if (sortBy === 'steps') return b.steps - a.steps;
        if (sortBy === 'calories') return b.calories - a.calories;
        return 0;
    });

    // Статистика
    const totalSteps = activities.reduce((sum, a) => sum + a.steps, 0);
    const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);

    // Запись, ожидающая подтверждения удаления
    const pendingItem = activities.find(a => a.id === deleteId);

    // === Экран загрузки (Часть 3) ===
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

    // === Экран ошибки с кнопкой «Повторить» (Часть 3) ===
    if (error) {
        return (
            <div className="app">
                <div className="error-screen">
                    <div className="error-icon">⚠️</div>
                    <h2>Ошибка</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => { setLoading(true); loadData(search); }}>
                        Повторить
                    </button>
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

            {/* Статистика */}
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

            {/* Форма */}
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

            {/* Список */}
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

            <footer className="footer">Лабораторная работа №5 · React · REST API</footer>

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

            {/* Всплывающее уведомление об ошибке операции */}
            {notice && (
                <div className="notice">{notice}</div>
            )}
        </div>
    );
}

export default App;
