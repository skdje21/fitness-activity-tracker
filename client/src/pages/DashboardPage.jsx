import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSummary, fetchActivities } from '../api';

const ACH_ICONS = {
    first_activity: '🎯', steps_10k_day: '👟', steps_100k_total: '🏅',
    calories_10k_total: '🔥', streak_7: '📅', multisport: '🤸',
};
const TYPE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6'];

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [recent, setRecent] = useState([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [s, a] = await Promise.all([fetchSummary(), fetchActivities()]);
                if (!alive) return;
                setData(s.data.data);
                const list = [...a.data].sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 5);
                setRecent(list);
            } catch (e) {
                if (alive) setError(true);
            }
        })();
        return () => { alive = false; };
    }, []);

    if (error) {
        return (
            <div className="error-screen">
                <div className="error-icon">⚠️</div>
                <h2>Ошибка</h2>
                <p>Не удалось загрузить статистику. Проверьте, запущен ли сервер.</p>
            </div>
        );
    }
    if (!data) {
        return <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>;
    }

    const maxSeries = Math.max(1, ...data.series.map((d) => d.steps));
    const byType = (data.byType || []).slice().sort((a, b) => b.totalSteps - a.totalSteps);
    const maxType = Math.max(1, ...byType.map((t) => t.totalSteps));

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Дашборд</h2>
                    <p className="subtitle">Обзор вашей активности</p>
                </div>
            </section>

            {/* Итоги */}
            <section className="dash-cards">
                <div className={'dash-card' + (data.totals.steps > 0 ? ' filled' : '')}><span className="dash-val">{nf(data.totals.steps)}</span><span className="dash-lbl">Всего шагов</span></div>
                <div className={'dash-card' + (data.totals.calories > 0 ? ' filled' : '')}><span className="dash-val">{nf(data.totals.calories)}</span><span className="dash-lbl">Всего калорий</span></div>
                <div className={'dash-card' + (data.totals.activeDays > 0 ? ' filled' : '')}><span className="dash-val">{nf(data.totals.activeDays)}</span><span className="dash-lbl">Активных дней</span></div>
            </section>

            <div className="dash-grid">
                {/* Цели (read-only) */}
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
                    <h3>Достижения ({data.achievements.length})</h3>
                    {data.achievements.length === 0 ? (
                        <p className="subtitle">Пока нет — добавьте активности!</p>
                    ) : (
                        <div className="ach-list">
                            {data.achievements.map((a) => (
                                <div className="ach-badge" key={a.code} title={a.title}>
                                    <span className="ach-icon">{ACH_ICONS[a.code] || '🏆'}</span>
                                    <span className="ach-title">{a.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* График за 7 дней */}
            <section className="card">
                <h3>Шаги за последние 7 дней</h3>
                <div className="chart-bars">
                    {data.series.map((d) => (
                        <div className="chart-col" key={d.date} title={`${d.date}: ${nf(d.steps)} шагов`}>
                            <div className="chart-bar-wrap">
                                <div className="chart-bar" style={{ height: `${Math.round((d.steps / maxSeries) * 100)}%` }} />
                            </div>
                            <span className="chart-x">{d.date.slice(8)}.{d.date.slice(5, 7)}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Распределение по типам */}
            {byType.length > 0 && (
                <section className="card">
                    <h3>Распределение по типам активности</h3>
                    <div className="type-bars">
                        {byType.map((t, i) => (
                            <div className="type-row" key={t.type}>
                                <span className="type-name">{t.type}</span>
                                <div className="type-track">
                                    <div className="type-fill" style={{ width: `${Math.round((t.totalSteps / maxType) * 100)}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                                </div>
                                <span className="type-val">{nf(t.totalSteps)} шаг.</span>
                            </div>
                        ))}
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
                                    <td>{a.date}</td>
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

function GoalBar({ label, value, goal, percent, color }) {
    const width = Math.min(100, percent);
    const reached = percent >= 100;
    return (
        <div className="goal-row">
            <div className="goal-top">
                <span>{label}</span>
                <span className="goal-nums">{nf(value)} / {nf(goal)} {reached ? '✅' : `(${percent}%)`}</span>
            </div>
            <div className="goal-track">
                <div className="goal-fill" style={{ width: `${width}%`, background: color }} />
            </div>
        </div>
    );
}
