import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchSummary, fetchActivities, fetchSeries, exportCSV } from '../api';

const ACH_ICONS = {
    first_activity: '🎯', sessions_10: '💪', sessions_50: '⭐', sessions_100: '👑',
    steps_5k_day: '🚶', steps_10k_day: '👟', steps_20k_day: '🏃',
    steps_50k_total: '📈', steps_100k_total: '🏅', steps_500k_total: '🌟', steps_1m_total: '💎',
    calories_1k_total: '🔥', calories_10k_total: '🔥', calories_50k_total: '🌋',
    streak_3: '📅', streak_7: '🗓️', streak_14: '🔥', streak_30: '🏆',
    multisport: '🤸', multisport_4: '🎪',
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
                <div className="error-icon">⚠️</div>
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
                <button className="btn btn-ghost" onClick={handleExportCSV} title="Скачать CSV">📥 Экспорт CSV</button>
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
                                    <span className="ach-icon">{ACH_ICONS[a.code] || '🏆'}</span>
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
   SeriesChart — SVG bar/line chart with tooltip
   ============================================================ */
function SeriesChart({ data, metric, range }) {
    const [hover, setHover] = useState(null);
    if (!data || data.length === 0) return <p className="subtitle">Нет данных за период</p>;

    const W = 700, H = 180, PX = 40, PY = 20;
    const plotW = W - PX * 2, plotH = H - PY * 2;
    const vals = data.map(d => d[metric] || 0);
    const maxVal = Math.max(1, ...vals);
    const barW = Math.max(4, Math.min(24, (plotW / data.length) - 2));

    function formatLabel(d) {
        const s = d.date;
        if (range === '7d' || range === '30d') return s.slice(8) + '.' + s.slice(5, 7);
        return s.slice(5, 7) + '/' + s.slice(8);
    }

    const metricLabel = metric === 'steps' ? 'шаг.' : metric === 'calories' ? 'ккал' : 'мин';
    const step = Math.max(1, Math.floor(data.length / 8));

    return (
        <div className="series-chart-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="series-chart-svg">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = PY + plotH - f * plotH;
                    return (
                        <g key={f}>
                            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                            <text x={PX - 4} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="9">{nf(Math.round(maxVal * f))}</text>
                        </g>
                    );
                })}

                {/* Bars */}
                {data.map((d, i) => {
                    const x = PX + (i + 0.5) * (plotW / data.length);
                    const v = d[metric] || 0;
                    const h = (v / maxVal) * plotH;
                    const y = PY + plotH - h;
                    return (
                        <g key={d.date}
                           onMouseEnter={() => setHover({ i, x, y, v, date: d.date })}
                           onMouseLeave={() => setHover(null)}>
                            <rect
                                x={x - barW / 2} y={y} width={barW} height={Math.max(1, h)}
                                rx={3}
                                fill={hover?.i === i ? '#34d399' : '#22c55e'}
                                opacity={hover?.i === i ? 1 : 0.8}
                            />
                            {i % step === 0 && (
                                <text x={x} y={H - 2} textAnchor="middle" fill="var(--muted)" fontSize="9">{formatLabel(d)}</text>
                            )}
                        </g>
                    );
                })}

                {/* Tooltip */}
                {hover && (
                    <g>
                        <rect x={hover.x - 50} y={hover.y - 30} width={100} height={22} rx={6} fill="var(--card)" stroke="var(--border)" />
                        <text x={hover.x} y={hover.y - 15} textAnchor="middle" fill="var(--text)" fontSize="11" fontWeight="600">{nf(hover.v)} {metricLabel}</text>
                    </g>
                )}
            </svg>
        </div>
    );
}

/* ============================================================
   DonutChart — SVG donut pie chart
   ============================================================ */
function DonutChart({ data, colors }) {
    const [hover, setHover] = useState(null);
    const total = data.reduce((s, d) => s + (d.totalSteps || 0), 0);
    if (total === 0) return null;

    const R = 70, r = 42, cx = 90, cy = 90;
    let startAngle = -Math.PI / 2;

    const slices = data.map((d, i) => {
        const pct = d.totalSteps / total;
        const angle = pct * Math.PI * 2;
        const endAngle = startAngle + angle;
        const largeArc = angle > Math.PI ? 1 : 0;

        const x1o = cx + R * Math.cos(startAngle);
        const y1o = cy + R * Math.sin(startAngle);
        const x2o = cx + R * Math.cos(endAngle);
        const y2o = cy + R * Math.sin(endAngle);
        const x1i = cx + r * Math.cos(endAngle);
        const y1i = cy + r * Math.sin(endAngle);
        const x2i = cx + r * Math.cos(startAngle);
        const y2i = cy + r * Math.sin(startAngle);

        const path = [
            `M ${x1o} ${y1o}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${x2o} ${y2o}`,
            `L ${x1i} ${y1i}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${x2i} ${y2i}`,
            'Z',
        ].join(' ');

        startAngle = endAngle;
        return { path, color: colors[i % colors.length], type: d.type, steps: d.totalSteps, pct: Math.round(pct * 100) };
    });

    return (
        <div className="donut-wrap">
            <svg viewBox="0 0 180 180" className="donut-svg">
                {slices.map((s, i) => (
                    <path
                        key={s.type}
                        d={s.path}
                        fill={s.color}
                        opacity={hover === null || hover === i ? 1 : 0.4}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                    />
                ))}
                {/* Center text */}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="700">
                    {hover !== null ? `${slices[hover].pct}%` : nf(total)}
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--muted)" fontSize="10">
                    {hover !== null ? slices[hover].type : 'шагов'}
                </text>
            </svg>
        </div>
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
                <span className="goal-nums">{nf(value)} / {nf(goal)} {reached ? '✅' : `(${percent}%)`}</span>
            </div>
            <div className="goal-track">
                <div className="goal-fill" style={{ width: `${width}%`, background: color }} />
            </div>
        </div>
    );
}
