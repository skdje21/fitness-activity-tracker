import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchSummary, fetchActivities, fetchSeries, exportCSV } from '../api';
import Icon from '../components/Icon';
import { SeriesChart, DonutChart } from '../components/Charts';

export const ACH_ICONS = {
    first_activity: 'target', sessions_10: 'award', sessions_50: 'star', sessions_100: 'crown',
    steps_5k_day: 'footprints', steps_10k_day: 'footprints', steps_20k_day: 'activity',
    steps_50k_total: 'trending', steps_100k_total: 'award', steps_500k_total: 'star', steps_1m_total: 'gem',
    calories_1k_total: 'flame', calories_10k_total: 'flame', calories_50k_total: 'flame',
    streak_3: 'calendar', streak_7: 'calendar', streak_14: 'flame', streak_30: 'trophy',
    multisport: 'sparkles', multisport_4: 'sparkles',
};
const TYPE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6'];
const RANGES = [
    { key: '7d', label: '7 дней' },
    { key: '30d', label: '30 дней' },
    { key: '3m', label: '3 месяца' },
    { key: '1y', label: 'Год' },
];

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [recent, setRecent] = useState([]);
    const [error, setError] = useState(false);

    // Series chart state
    const [range, setRange] = useState('7d');
    const [series, setSeries] = useState([]);
    const [seriesMetric, setSeriesMetric] = useState('steps');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [s, a] = await Promise.all([fetchSummary(), fetchActivities()]);
                if (!alive) return;
                setData(s.data.data);
                const raw = a.data.data || a.data;
                const list = [...(Array.isArray(raw) ? raw : raw.data || [])].sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 5);
                setRecent(list);
            } catch (e) {
                if (alive) setError(true);
            }
        })();
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        let alive = true;
        fetchSeries(range).then(r => {
            if (alive) setSeries(r.data.data || []);
        }).catch(() => {});
        return () => { alive = false; };
    }, [range]);

    async function handleExportCSV() {
        try {
            const res = await exportCSV();
            const url = window.URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'activities.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    }

    if (error) {
        return (
            <div className="error-screen">
                <div className="error-icon"><Icon name="alert" size={40} /></div>
                <h2>Ошибка</h2>
                <p>Не удалось загрузить статистику. Проверьте, запущен ли сервер.</p>
            </div>
        );
    }
    if (!data) {
        return <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>;
    }

    const byType = (data.byType || []).slice().sort((a, b) => b.totalSteps - a.totalSteps);
    const maxType = Math.max(1, ...byType.map((t) => t.totalSteps));

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Дашборд</h2>
                    <p className="subtitle">Обзор вашей активности</p>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={handleExportCSV} title="Скачать CSV"><Icon name="download" size={16} /> Экспорт CSV</button>
            </section>

            {/* Итоги */}
            <section className="dash-cards fade-in-up" style={{ animationDelay: '0.05s' }}>
                <div className={'dash-card' + (data.totals.steps > 0 ? ' filled' : '')}><span className="dash-val">{nf(data.totals.steps)}</span><span className="dash-lbl">Всего шагов</span></div>
                <div className={'dash-card' + (data.totals.calories > 0 ? ' filled' : '')}><span className="dash-val">{nf(data.totals.calories)}</span><span className="dash-lbl">Всего калорий</span></div>
                <div className={'dash-card' + (data.totals.activeDays > 0 ? ' filled' : '')}><span className="dash-val">{nf(data.totals.activeDays)}</span><span className="dash-lbl">Активных дней</span></div>
            </section>

            <div className="dash-grid">
                {/* Цели */}
                <section className="card">
                    <div className="card-head">
                        <h3>Цели на сегодня</h3>
                        <Link to="/profile" className="auth-link">Изменить</Link>
                    </div>
                    <GoalBar label="Шаги" value={data.today.steps} goal={data.goals.dailySteps} percent={data.progress.steps} color="#22c55e" />
                    <GoalBar label="Калории" value={data.today.calories} goal={data.goals.dailyCalories} percent={data.progress.calories} color="#f59e0b" />
                </section>

                {/* Достижения */}
                <section className="card">
                    <div className="card-head">
                        <h3>Достижения ({data.achievements.length})</h3>
                        {data.achievements.length > 4 && <Link to="/profile" className="auth-link">Все →</Link>}
                    </div>
                    {data.achievements.length === 0 ? (
                        <p className="subtitle">Пока нет — добавьте активности!</p>
                    ) : (
                        <div className="ach-list">
                            {data.achievements.slice(0, 4).map((a) => (
                                <div className="ach-badge" key={a.code || a._id} title={a.title}>
                                    <span className="ach-icon"><Icon name={ACH_ICONS[a.code] || 'trophy'} size={16} /></span>
                                    <span className="ach-title">{a.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* График активности по периодам */}
            <section className="card">
                <div className="card-head">
                    <h3>Активность</h3>
                    <div className="range-btns">
                        {RANGES.map(r => (
                            <button key={r.key} className={'range-btn' + (range === r.key ? ' active' : '')} onClick={() => setRange(r.key)}>{r.label}</button>
                        ))}
                    </div>
                </div>
                <div className="metric-toggle">
                    <button className={'metric-btn' + (seriesMetric === 'steps' ? ' active' : '')} onClick={() => setSeriesMetric('steps')}>Шаги</button>
                    <button className={'metric-btn' + (seriesMetric === 'calories' ? ' active' : '')} onClick={() => setSeriesMetric('calories')}>Калории</button>
                    <button className={'metric-btn' + (seriesMetric === 'minutes' ? ' active' : '')} onClick={() => setSeriesMetric('minutes')}>Минуты</button>
                </div>
                <SeriesChart data={series} metric={seriesMetric} range={range} />
            </section>

            {/* Donut chart + type bars side-by-side */}
            {byType.length > 0 && (
                <section className="card">
                    <h3>Распределение по типам активности</h3>
                    <div className="type-section">
                        <DonutChart data={byType} colors={TYPE_COLORS} />
                        <div className="type-bars">
                            {byType.map((t, i) => (
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

            {/* Последние активности */}
            <section className="card">
                <div className="card-head">
                    <h3>Последние активности</h3>
                    <Link to="/activities" className="auth-link">Все →</Link>
                </div>
                {recent.length === 0 ? (
                    <p className="subtitle">Пока нет записей.</p>
                ) : (
                    <table className="table">
                        <tbody>
                            {recent.map((a) => (
                                <tr key={a.id}>
                                    <td>{new Date(a.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td><span className="badge">{a.type}</span></td>
                                    <td className="num">{nf(a.steps)} шаг.</td>
                                    <td className="num">{nf(a.calories)} ккал</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </>
    );
}

/* ============================================================
   GoalBar
   ============================================================ */
function GoalBar({ label, value, goal, percent, color }) {
    const width = Math.min(100, percent);
    const reached = percent >= 100;
    return (
        <div className="goal-row">
            <div className="goal-top">
                <span>{label}</span>
                <span className="goal-nums">{nf(value)} / {nf(goal)} {reached ? <Icon name="check" size={14} className="goal-done" /> : `(${percent}%)`}</span>
            </div>
            <div className="goal-track">
                <div className="goal-fill" style={{ width: `${width}%`, background: color }} />
            </div>
        </div>
    );
}
