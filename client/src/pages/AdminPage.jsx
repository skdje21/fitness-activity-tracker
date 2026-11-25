import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
    fetchAdminOverview, fetchAdminUsers, fetchAdminUser,
    setUserBlocked, setUserRole, unlockUser, deleteUser,
    fetchAdminActivities, deleteAdminActivity,
} from '../api';
import Icon from '../components/Icon';
import Portal from '../components/Portal';
import { SeriesChart, DonutChart } from '../components/Charts';

const TYPE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6'];
const PAGE_SIZE = 10;

const TABS = [
    { key: 'overview', label: 'Обзор', icon: 'trending' },
    { key: 'users', label: 'Пользователи', icon: 'users' },
    { key: 'activities', label: 'Модерация', icon: 'shield' },
];

const USER_SORTS = [
    { key: 'createdAt', label: 'Сортировка: новые' },
    { key: 'activity', label: 'Сортировка: по активностям' },
    { key: 'steps', label: 'Сортировка: по шагам' },
    { key: 'name', label: 'Сортировка: по имени (А-Я)' },
];

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

function fmtDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminPage({ me }) {
    const [tab, setTab] = useState('overview');
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 3000);
        return () => clearTimeout(t);
    }, [notice]);

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Панель управления</h2>
                    <p className="subtitle">Аналитика платформы, пользователи и модерация</p>
                </div>
            </section>

            <div className="admin-tabs">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        className={'admin-tab' + (tab === t.key ? ' active' : '')}
                        onClick={() => setTab(t.key)}
                    >
                        <Icon name={t.icon} size={16} />
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab onNotice={setNotice} />}
            {tab === 'users' && <UsersTab me={me} onNotice={setNotice} />}
            {tab === 'activities' && <ActivitiesTab onNotice={setNotice} />}

            {notice && <div className={'notice' + (notice.ok ? ' notice-ok' : '')}>{notice.msg}</div>}
        </>
    );
}

/* ============================================================
   Вкладка 1 — Обзор платформы
   ============================================================ */
function OverviewTab({ onNotice }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [online, setOnline] = useState(null);

    useEffect(() => {
        let alive = true;
        fetchAdminOverview()
            .then((r) => { if (alive) setData(r.data.data); })
            .catch(() => { if (alive) setError(true); });
        return () => { alive = false; };
    }, []);

    // Онлайн в реальном времени через Socket.IO
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const socket = io(import.meta.env.VITE_API_URL, { auth: { token } });
        socket.on('onlineCount', (n) => setOnline(n));
        socket.on('connect_error', () => setOnline(null));
        return () => socket.disconnect();
    }, []);

    if (error) {
        return (
            <div className="error-screen">
                <div className="error-icon"><Icon name="alert" size={40} /></div>
                <h2>Ошибка</h2>
                <p>Не удалось загрузить статистику платформы.</p>
            </div>
        );
    }
    if (!data) return <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>;

    const k = data.kpi;
    const tiles = [
        { label: 'Всего пользователей', value: nf(k.totalUsers), icon: 'users' },
        { label: 'Новых за 7 дней', value: nf(k.newUsers7d), icon: 'trending' },
        { label: 'Активных за 7 дней', value: nf(k.activeUsers7d), icon: 'activity' },
        { label: 'Онлайн сейчас', value: online === null ? '—' : nf(online), icon: 'bell', live: true },
        { label: 'Всего активностей', value: nf(k.totalActivities), icon: 'calendar' },
        { label: 'Шагов на платформе', value: nf(k.totalSteps), icon: 'footprints' },
        { label: 'Калорий сожжено', value: nf(k.totalCalories), icon: 'flame' },
        { label: 'Заблокировано', value: nf(k.blockedUsers), icon: 'ban', danger: k.blockedUsers > 0 },
    ];

    const maxType = Math.max(1, ...data.byType.map((t) => t.totalSteps));

    return (
        <>
            <section className="admin-kpi-grid fade-in-up">
                {tiles.map((t) => (
                    <div className="stat-card admin-kpi" key={t.label}>
                        <span className={'admin-kpi-icon' + (t.danger ? ' danger' : '')}>
                            <Icon name={t.icon} size={16} />
                            {t.live && online !== null && <span className="conn-dot online" />}
                        </span>
                        <span className="stat-value">{t.value}</span>
                        <span className="stat-label">{t.label}</span>
                    </div>
                ))}
            </section>

            <section className="card">
                <div className="card-head">
                    <h3>Регистрации за 30 дней</h3>
                    <span className="subtitle">рост базы пользователей</span>
                </div>
                <SeriesChart data={data.registrations} metric="count" range="30d" unit="рег." />
            </section>

            {data.byType.length > 0 && (
                <section className="card">
                    <h3>Активности платформы по типам</h3>
                    <div className="type-section">
                        <DonutChart data={data.byType} colors={TYPE_COLORS} />
                        <div className="type-bars">
                            {data.byType.map((t, i) => (
                                <div className="type-row" key={t.type}>
                                    <span className="type-name">
                                        <span className="type-dot" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                                        {t.type}
                                    </span>
                                    <div className="type-track">
                                        <div className="type-fill" style={{ width: `${Math.round((t.totalSteps / maxType) * 100)}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                                    </div>
                                    <span className="type-val">{nf(t.totalSteps)} шаг.</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

/* ============================================================
   Вкладка 2 — Управление пользователями
   ============================================================ */
function UsersTab({ me, onNotice }) {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('createdAt');
    const [loading, setLoading] = useState(true);
    const [detailId, setDetailId] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const load = useCallback(async (p = page) => {
        setLoading(true);
        try {
            const r = await fetchAdminUsers({ page: p, limit: PAGE_SIZE, search, sort });
            setRows(r.data.data);
            setTotal(r.data.total);
            setPage(r.data.page);
        } catch {
            onNotice({ msg: 'Не удалось загрузить пользователей', ok: false });
        } finally {
            setLoading(false);
        }
    }, [page, search, sort, onNotice]);

    useEffect(() => {
        const t = setTimeout(() => load(1), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, sort]);

    async function act(fn, okMsg) {
        try {
            await fn();
            onNotice({ msg: okMsg, ok: true });
            load(page);
        } catch (err) {
            onNotice({ msg: err.response?.data?.error || 'Операция не выполнена', ok: false });
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <>
            <section className="card">
                <div className="controls">
                    <div className="search">
                        <span className="search-icon"><Icon name="search" size={16} /></span>
                        <input
                            type="text"
                            placeholder="Поиск по email или имени…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        {USER_SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>
                ) : rows.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon"><Icon name="inbox" size={40} /></div>
                        <p>Пользователи не найдены</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Пользователь</th>
                                        <th>Статус</th>
                                        <th className="num">Активности</th>
                                        <th className="num">Шаги</th>
                                        <th>Регистрация</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((u) => {
                                        const isMe = me && u.id === me.id;
                                        const locked = u.lockUntil && new Date(u.lockUntil) > new Date();
                                        return (
                                            <tr
                                                key={u.id}
                                                className="row-clickable"
                                                onClick={() => setDetailId(u.id)}
                                                title="Открыть карточку пользователя"
                                            >
                                                <td>
                                                    <div className="admin-user-cell">
                                                        <span className="admin-user-name">
                                                            {u.name || '—'}
                                                            {isMe && <span className="lb-you">вы</span>}
                                                        </span>
                                                        <span className="admin-user-email">{u.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="admin-status">
                                                        {u.role === 'admin' && <span className="chip chip-admin">admin</span>}
                                                        {u.isBlocked
                                                            ? <span className="chip chip-danger">заблокирован</span>
                                                            : <span className="chip chip-ok">активен</span>}
                                                        {locked && <span className="chip chip-warn">вход закрыт</span>}
                                                    </div>
                                                </td>
                                                <td className="num">
                                                    {u.role === 'admin' ? <span className="cell-empty">—</span> : nf(u.activityCount)}
                                                </td>
                                                <td className="num">
                                                    {u.role === 'admin' ? <span className="cell-empty">—</span> : nf(u.totalSteps)}
                                                </td>
                                                <td>{fmtDate(u.createdAt)}</td>
                                                <td className="actions" onClick={(e) => e.stopPropagation()}>
                                                    <button className="icon-btn" title="Детали" onClick={() => setDetailId(u.id)}>
                                                        <Icon name="info" size={15} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        title={u.role === 'admin' ? 'Снять админа' : 'Назначить админом'}
                                                        disabled={isMe}
                                                        onClick={() => act(
                                                            () => setUserRole(u.id, u.role === 'admin' ? 'user' : 'admin'),
                                                            u.role === 'admin' ? 'Роль снята' : 'Назначен администратором'
                                                        )}
                                                    >
                                                        <Icon name={u.role === 'admin' ? 'user' : 'user-check'} size={15} />
                                                    </button>
                                                    {locked && (
                                                        <button
                                                            className="icon-btn"
                                                            title="Снять блокировку входа"
                                                            onClick={() => act(() => unlockUser(u.id), 'Блокировка входа снята')}
                                                        >
                                                            <Icon name="unlock" size={15} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className={'icon-btn' + (u.isBlocked ? '' : ' danger')}
                                                        title={u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                                        disabled={isMe}
                                                        onClick={() => act(
                                                            () => setUserBlocked(u.id, !u.isBlocked),
                                                            u.isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован'
                                                        )}
                                                    >
                                                        <Icon name={u.isBlocked ? 'unlock' : 'ban'} size={15} />
                                                    </button>
                                                    <button
                                                        className="icon-btn danger"
                                                        title="Удалить"
                                                        disabled={isMe}
                                                        onClick={() => setConfirm(u)}
                                                    >
                                                        <Icon name="trash" size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => load(page - 1)}>← Назад</button>
                                <span className="pagination-info">Страница {page} из {totalPages} · всего {nf(total)}</span>
                                <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => load(page + 1)}>Вперёд →</button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {detailId && <UserDetailModal id={detailId} onClose={() => setDetailId(null)} />}

            {confirm && (
                <Portal>
                    <div className="modal-overlay" onClick={() => setConfirm(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-icon modal-icon-danger"><Icon name="trash" size={30} /></div>
                            <h3>Удалить пользователя?</h3>
                            <p className="modal-text">
                                Аккаунт <b>{confirm.email}</b> и все его данные (активности, профиль,
                                достижения, история веса) будут удалены безвозвратно.
                            </p>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Отмена</button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => { const u = confirm; setConfirm(null); act(() => deleteUser(u.id), 'Пользователь удалён'); }}
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}

/* ============================================================
   Карточка пользователя (модальное окно)
   ============================================================ */
function UserDetailModal({ id, onClose }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        fetchAdminUser(id)
            .then((r) => { if (alive) setData(r.data.data); })
            .catch(() => { if (alive) setError(true); });
        return () => { alive = false; };
    }, [id]);

    return (
        <Portal>
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close icon-btn" onClick={onClose} title="Закрыть">
                    <Icon name="close" size={16} />
                </button>

                {error ? (
                    <p className="subtitle">Не удалось загрузить данные пользователя.</p>
                ) : !data ? (
                    <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>
                ) : (
                    <>
                        <h3>{data.user.name || 'Без имени'}</h3>
                        <p className="subtitle admin-modal-sub">{data.user.email}</p>

                        <div className="admin-status admin-modal-chips">
                            {data.user.role === 'admin' && <span className="chip chip-admin">admin</span>}
                            {data.user.isBlocked
                                ? <span className="chip chip-danger">заблокирован</span>
                                : <span className="chip chip-ok">активен</span>}
                            <span className="chip">с {fmtDate(data.user.createdAt)}</span>
                        </div>

                        <div className="dash-cards admin-modal-stats">
                            <div className="dash-card filled">
                                <span className="dash-val">{nf(data.totals.totalSteps)}</span>
                                <span className="dash-lbl">Шагов</span>
                            </div>
                            <div className="dash-card filled">
                                <span className="dash-val">{nf(data.totals.totalCalories)}</span>
                                <span className="dash-lbl">Калорий</span>
                            </div>
                            <div className="dash-card filled">
                                <span className="dash-val">{nf(data.totals.activeDays)}</span>
                                <span className="dash-lbl">Активных дней</span>
                            </div>
                        </div>

                        {(data.profile || data.goals) && (
                            <div className="profile-view admin-modal-block">
                                {data.goals && (
                                    <div className="profile-row">
                                        <span className="profile-label">Цели (шаги / калории)</span>
                                        <span className="profile-value">{nf(data.goals.dailySteps)} / {nf(data.goals.dailyCalories)}</span>
                                    </div>
                                )}
                                {data.profile?.height && (
                                    <div className="profile-row">
                                        <span className="profile-label">Рост</span>
                                        <span className="profile-value">{data.profile.height} см</span>
                                    </div>
                                )}
                                {data.profile?.weight && (
                                    <div className="profile-row">
                                        <span className="profile-label">Вес</span>
                                        <span className="profile-value">{data.profile.weight} кг</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="admin-modal-block">
                            <div className="feed-list-head">Достижения ({data.achievements.length})</div>
                            {data.achievements.length === 0
                                ? <p className="subtitle">Пока нет достижений.</p>
                                : (
                                    <div className="ach-list">
                                        {data.achievements.map((a) => (
                                            <div className="ach-badge" key={a.code || a._id}>
                                                <span className="ach-icon"><Icon name="trophy" size={14} /></span>
                                                <span className="ach-title">{a.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>

                        <div className="admin-modal-block">
                            <div className="feed-list-head">Последние активности</div>
                            {data.activities.length === 0 ? (
                                <p className="subtitle">Активностей нет.</p>
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <tbody>
                                            {data.activities.map((a) => (
                                                <tr key={a.id}>
                                                    <td>{fmtDate(a.date)}</td>
                                                    <td><span className="badge">{a.type}</span></td>
                                                    <td className="num">{nf(a.steps)} шаг.</td>
                                                    <td className="num">{nf(a.calories)} ккал</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
        </Portal>
    );
}

/* ============================================================
   Вкладка 3 — Модерация активностей (анти-чит)
   ============================================================ */
function ActivitiesTab({ onNotice }) {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [type, setType] = useState('');
    const [minSteps, setMinSteps] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirm, setConfirm] = useState(null);

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p, limit: PAGE_SIZE };
            if (type.trim()) params.type = type.trim();
            if (minSteps) params.minSteps = minSteps;
            const r = await fetchAdminActivities(params);
            setRows(r.data.data);
            setTotal(r.data.total);
            setPage(r.data.page);
        } catch {
            onNotice({ msg: 'Не удалось загрузить активности', ok: false });
        } finally {
            setLoading(false);
        }
    }, [type, minSteps, onNotice]);

    useEffect(() => {
        const t = setTimeout(() => load(1), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, minSteps]);

    async function remove(a) {
        try {
            await deleteAdminActivity(a.id);
            onNotice({ msg: 'Активность удалена', ok: true });
            load(page);
        } catch (err) {
            onNotice({ msg: err.response?.data?.error || 'Не удалось удалить', ok: false });
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const SUSPICIOUS = 30000;

    return (
        <>
            <section className="card">
                <div className="card-head">
                    <h3>Активности всех пользователей</h3>
                    <button
                        className={'range-btn' + (String(minSteps) === String(SUSPICIOUS) ? ' active' : '')}
                        onClick={() => setMinSteps(String(minSteps) === String(SUSPICIOUS) ? '' : String(SUSPICIOUS))}
                        title="Показать записи с аномально большим числом шагов"
                    >
                        Только аномалии
                    </button>
                </div>

                <div className="controls">
                    <div className="search">
                        <span className="search-icon"><Icon name="search" size={16} /></span>
                        <input
                            type="text"
                            placeholder="Фильтр по типу активности…"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        />
                    </div>
                    <div className="field admin-filter-steps">
                        <input
                            type="number"
                            min="0"
                            placeholder="Шагов от…"
                            value={minSteps}
                            onChange={(e) => setMinSteps(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>
                ) : rows.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon"><Icon name="inbox" size={40} /></div>
                        <p>Записей не найдено</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Дата</th>
                                        <th>Пользователь</th>
                                        <th>Тип</th>
                                        <th className="num">Шаги</th>
                                        <th className="num">Калории</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((a) => (
                                        <tr key={a.id} className={a.steps >= SUSPICIOUS ? 'row-suspicious' : ''}>
                                            <td>{fmtDate(a.date)}</td>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <span className="admin-user-name">{a.name || '—'}</span>
                                                    <span className="admin-user-email">{a.email}</span>
                                                </div>
                                            </td>
                                            <td><span className="badge">{a.type}</span></td>
                                            <td className="num">
                                                {nf(a.steps)}
                                                {a.steps >= SUSPICIOUS && (
                                                    <span className="chip chip-warn admin-flag" title="Подозрительно много шагов">
                                                        <Icon name="alert" size={11} />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="num">{nf(a.calories)}</td>
                                            <td className="actions">
                                                <button className="icon-btn danger" title="Удалить запись" onClick={() => setConfirm(a)}>
                                                    <Icon name="trash" size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => load(page - 1)}>← Назад</button>
                                <span className="pagination-info">Страница {page} из {totalPages} · всего {nf(total)}</span>
                                <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => load(page + 1)}>Вперёд →</button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {confirm && (
                <Portal>
                    <div className="modal-overlay" onClick={() => setConfirm(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-icon modal-icon-danger"><Icon name="trash" size={30} /></div>
                            <h3>Удалить активность?</h3>
                            <p className="modal-text">
                                Запись «{confirm.type}» ({nf(confirm.steps)} шагов) пользователя <b>{confirm.email}</b> будет удалена.
                            </p>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Отмена</button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => { const a = confirm; setConfirm(null); remove(a); }}
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}
