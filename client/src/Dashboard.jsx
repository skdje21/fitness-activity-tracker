import { useState, useEffect } from 'react';
import { fetchSummary, updateGoals } from './api';

const ACH_ICONS = {
    first_activity: '🎯',
    steps_10k_day: '👟',
    steps_100k_total: '🏅',
    calories_10k_total: '🔥',
    streak_7: '📅',
    multisport: '🤸',
};

function nf(n) {
    return Number(n || 0).toLocaleString('ru-RU');
}

export default function Dashboard({ version }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [editGoals, setEditGoals] = useState(false);
    const [stepsGoal, setStepsGoal] = useState('');
    const [calGoal, setCalGoal] = useState('');

    async function load() {
        try {
            setError(false);
            const res = await fetchSummary();
            setData(res.data.data);
        } catch (e) {
            setError(true);
        }
    }

    useEffect(() => { load(); }, [version]);

    async function saveGoals() {
        try {
            await updateGoals({ dailySteps: Number(stepsGoal), dailyCalories: Number(calGoal) });
            setEditGoals(false);
            load();
        } catch (e) { /* игнорируем, останемся в режиме редактирования */ }
    }

    if (error) {
        return (
            <section className="card">
                <h2>📊 Статистика</h2>
                <p className="subtitle">Не удалось загрузить статистику (проверьте соединение с базой).</p>
            </section>
        );
    }
    if (!data) {
        return (
            <section className="card">
                <h2>📊 Статистика</h2>
                <p className="subtitle">Загрузка статистики…</p>
            </section>
        );
    }

    const maxSeries = Math.max(1, ...data.series.map((d) => d.steps));

    return (
        <section className="card">
            <h2>📊 Статистика и цели</h2>

            {/* Итоги за всё время */}
            <div className="dash-cards">
                <div className="dash-card"><span className="dash-val">{nf(data.totals.steps)}</span><span className="dash-lbl">Всего шагов</span></div>
                <div className="dash-card"><span className="dash-val">{nf(data.totals.calories)}</span><span className="dash-lbl">Всего калорий</span></div>
                <div className="dash-card"><span className="dash-val">{nf(data.totals.activeDays)}</span><span className="dash-lbl">Активных дней</span></div>
                <div className="dash-card"><span className="dash-val">{nf(data.totals.activeMinutes)}</span><span className="dash-lbl">Минут активности</span></div>
            </div>

            {/* Цели на сегодня */}
            <div className="dash-goals">
                <div className="dash-goals-head">
                    <h3>Цели на сегодня</h3>
                    {!editGoals ? (
                        <button className="btn btn-ghost" onClick={() => { setStepsGoal(String(data.goals.dailySteps)); setCalGoal(String(data.goals.dailyCalories)); setEditGoals(true); }}>
                            Изменить цели
                        </button>
                    ) : (
                        <div className="dash-goals-edit">
                            <input type="number" min="0" value={stepsGoal} onChange={(e) => setStepsGoal(e.target.value)} placeholder="шаги" />
                            <input type="number" min="0" value={calGoal} onChange={(e) => setCalGoal(e.target.value)} placeholder="ккал" />
                            <button className="btn btn-primary" onClick={saveGoals}>Сохранить</button>
                            <button className="btn btn-ghost" onClick={() => setEditGoals(false)}>Отмена</button>
                        </div>
                    )}
                </div>

                <GoalBar label="Шаги" value={data.today.steps} goal={data.goals.dailySteps} percent={data.progress.steps} color="#22c55e" />
                <GoalBar label="Калории" value={data.today.calories} goal={data.goals.dailyCalories} percent={data.progress.calories} color="#f59e0b" />
            </div>

            {/* График за 7 дней */}
            <div className="dash-chart">
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
            </div>

            {/* Достижения */}
            <div className="dash-ach">
                <h3>Достижения ({data.achievements.length})</h3>
                {data.achievements.length === 0 ? (
                    <p className="subtitle">Пока нет достижений — добавьте активности!</p>
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
            </div>
        </section>
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
