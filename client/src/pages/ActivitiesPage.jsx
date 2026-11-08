import { useState, useEffect } from 'react';
import { fetchActivities, addActivity, updateActivity, deleteActivity } from '../api';
import ActivityFormModal from '../components/ActivityFormModal';

export default function ActivitiesPage() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date');

    const [modal, setModal] = useState(null);      // { mode:'add' } | { mode:'edit', item }
    const [deleteItem, setDeleteItem] = useState(null);

    async function load(term = '') {
        try {
            setError(null);
            const res = await fetchActivities(term);
            setActivities(res.data);
        } catch (e) {
            setError('Не удалось загрузить данные. Проверьте, запущен ли сервер.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => load(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 3000);
        return () => clearTimeout(timer);
    }, [notice]);

    async function handleSubmit(payload) {
        if (modal.mode === 'add') {
            const tempId = Date.now();
            setActivities((prev) => [...prev, { id: tempId, ...payload }]);
            setModal(null);
            try {
                const res = await addActivity(payload);
                setActivities((prev) => prev.map((a) => (a.id === tempId ? res.data : a)));
            } catch (err) {
                setActivities((prev) => prev.filter((a) => a.id !== tempId));
                setNotice('Не удалось добавить запись');
            }
        } else {
            const id = modal.item.id;
            const prevItem = activities.find((a) => a.id === id);
            setActivities((prev) => prev.map((a) => (a.id === id ? { ...prevItem, ...payload } : a)));
            setModal(null);
            try {
                const res = await updateActivity(id, payload);
                setActivities((prev) => prev.map((a) => (a.id === id ? res.data : a)));
            } catch (err) {
                setActivities((prev) => prev.map((a) => (a.id === id ? prevItem : a)));
                setNotice('Не удалось обновить запись');
            }
        }
    }

    async function confirmDelete() {
        const item = deleteItem;
        setDeleteItem(null);
        setActivities((prev) => prev.filter((a) => a.id !== item.id));
        try {
            await deleteActivity(item.id);
        } catch (err) {
            setActivities((prev) => [...prev, item]);
            setNotice('Не удалось удалить запись');
        }
    }

    const visible = [...activities].sort((a, b) => {
        if (sortBy === 'date') return String(a.date).localeCompare(String(b.date));
        if (sortBy === 'steps') return b.steps - a.steps;
        if (sortBy === 'calories') return b.calories - a.calories;
        return 0;
    });

    if (loading) {
        return <div className="loader"><div className="spinner"></div><p>Загрузка данных…</p></div>;
    }
    if (error) {
        return (
            <div className="error-screen">
                <div className="error-icon">⚠️</div>
                <h2>Ошибка</h2>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => { setLoading(true); load(search); }}>Повторить</button>
            </div>
        );
    }

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Активности</h2>
                    <p className="subtitle">Все ваши записи: шаги и калории</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })}>+ Добавить активность</button>
            </section>

            <section className="card">
                <div className="controls">
                    <div className="search">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Поиск по типу…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="date">Сортировка: по дате</option>
                        <option value="steps">Сортировка: по шагам ↓</option>
                        <option value="calories">Сортировка: по калориям ↓</option>
                    </select>
                </div>

                {visible.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">📭</div>
                        <p>Записей не найдено</p>
                        <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })}>Добавить первую</button>
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
                            {visible.map((a) => (
                                <tr key={a.id}>
                                    <td>{a.date}</td>
                                    <td><span className="badge">{a.type}</span></td>
                                    <td className="num">{Number(a.steps).toLocaleString('ru-RU')}</td>
                                    <td className="num">{Number(a.calories).toLocaleString('ru-RU')}</td>
                                    <td className="actions">
                                        <button className="icon-btn" title="Редактировать" onClick={() => setModal({ mode: 'edit', item: a })}>✎</button>
                                        <button className="icon-btn danger" title="Удалить" onClick={() => setDeleteItem(a)}>🗑</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {modal && (
                <ActivityFormModal
                    initial={modal.mode === 'edit' ? modal.item : null}
                    onClose={() => setModal(null)}
                    onSubmit={handleSubmit}
                />
            )}

            {deleteItem && (
                <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon">🗑</div>
                        <h3>Удалить запись?</h3>
                        <p className="modal-text">Запись «{deleteItem.type}» за {deleteItem.date} будет удалена безвозвратно.</p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteItem(null)}>Отмена</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Удалить</button>
                        </div>
                    </div>
                </div>
            )}

            {notice && <div className="notice">{notice}</div>}
        </>
    );
}
