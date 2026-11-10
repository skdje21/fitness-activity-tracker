import { useState, useEffect } from 'react';
import { fetchActivities, addActivity, updateActivity, deleteActivity } from '../api';
import ActivityFormModal from '../components/ActivityFormModal';

function fmtDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

const PAGE_SIZE = 20;

export default function ActivitiesPage() {
    const [activities, setActivities] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date');

    const [modal, setModal] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    async function load(term = '', p = 1) {
        try {
            setError(null);
            const res = await fetchActivities(term, p, PAGE_SIZE);
            const body = res.data;
            setActivities(body.data || body);
            setTotal(body.total ?? 0);
            setPage(body.page ?? p);
        } catch (e) {
            setError('Не удалось загрузить данные. Проверьте, запущен ли сервер.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setPage(1);
            load(search, 1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 3000);
        return () => clearTimeout(timer);
    }, [notice]);

    function goPage(p) {
        setLoading(true);
        load(search, p);
    }

    async function handleSubmit(payload) {
        if (modal.mode === 'add') {
            setModal(null);
            try {
                await addActivity(payload);
                setNotice({ msg: 'Активность добавлена', ok: true });
                load(search, 1);
            } catch (err) {
                const msg = err.response?.data?.error || 'Не удалось добавить запись';
                setNotice({ msg, ok: false });
            }
        } else {
            const id = modal.item.id;
            setModal(null);
            try {
                await updateActivity(id, payload);
                setNotice({ msg: 'Запись обновлена', ok: true });
                load(search, page);
            } catch (err) {
                const msg = err.response?.data?.error || 'Не удалось обновить запись';
                setNotice({ msg, ok: false });
            }
        }
    }

    async function confirmDelete() {
        const item = deleteItem;
        setDeleteItem(null);
        try {
            await deleteActivity(item.id);
            setNotice({ msg: 'Запись удалена', ok: true });
            load(search, page);
        } catch (err) {
            setNotice({ msg: 'Не удалось удалить запись', ok: false });
        }
    }

    const visible = [...activities].sort((a, b) => {
        if (sortBy === 'date') return String(b.date).localeCompare(String(a.date));
        if (sortBy === 'steps') return b.steps - a.steps;
        if (sortBy === 'calories') return b.calories - a.calories;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (loading && activities.length === 0) {
        return <div className="loader"><div className="spinner"></div><p>Загрузка данных…</p></div>;
    }
    if (error) {
        return (
            <div className="error-screen">
                <div className="error-icon">⚠️</div>
                <h2>Ошибка</h2>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => { setLoading(true); load(search, page); }}>Повторить</button>
            </div>
        );
    }

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Активности</h2>
                    <p className="subtitle">Все ваши записи: шаги и калории ({total} записей)</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })}>+ Добавить активность</button>
            </section>

            <section className="card fade-in-up" style={{ animationDelay: '0.05s' }}>
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
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Дата</th><th>Тип</th>
                                    <th className="num">Шаги</th><th className="num">Калории</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((a, i) => (
                                    <tr key={a.id} className="fade-in-up" style={{ animationDelay: `${0.02 * i}s` }}>
                                        <td>{fmtDate(a.date)}</td>
                                        <td><span className="badge">{a.type}</span></td>
                                        <td className="num">{nf(a.steps)}</td>
                                        <td className="num">{nf(a.calories)}</td>
                                        <td className="actions">
                                            <button className="icon-btn" title="Редактировать" onClick={() => setModal({ mode: 'edit', item: a })}>✎</button>
                                            <button className="icon-btn danger" title="Удалить" onClick={() => setDeleteItem(a)}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Пагинация */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>← Назад</button>
                                <span className="pagination-info">
                                    Страница {page} из {totalPages}
                                </span>
                                <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>Вперёд →</button>
                            </div>
                        )}
                    </>
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
                        <p className="modal-text">Запись «{deleteItem.type}» за {fmtDate(deleteItem.date)} будет удалена безвозвратно.</p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteItem(null)}>Отмена</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Удалить</button>
                        </div>
                    </div>
                </div>
            )}

            {notice && <div className={'notice' + (notice.ok ? ' notice-ok' : '')}>{notice.msg}</div>}
        </>
    );
}
