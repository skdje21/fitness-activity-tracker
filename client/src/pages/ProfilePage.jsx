import { useState, useEffect } from 'react';
import { fetchMe, fetchGoals, updateGoals, fetchProfile, updateProfile, addWeight, fetchSummary } from '../api';

const ACH_ICONS = {
    first_activity: '🎯', sessions_10: '💪', sessions_50: '⭐', sessions_100: '👑',
    steps_5k_day: '🚶', steps_10k_day: '👟', steps_20k_day: '🏃',
    steps_50k_total: '📈', steps_100k_total: '🏅', steps_500k_total: '🌟', steps_1m_total: '💎',
    calories_1k_total: '🔥', calories_10k_total: '🔥', calories_50k_total: '🌋',
    streak_3: '📅', streak_7: '🗓️', streak_14: '🔥', streak_30: '🏆',
    multisport: '🤸', multisport_4: '🎪',
};

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

const GENDER_LABEL = { male: 'Мужской', female: 'Женский' };

export default function ProfilePage({ onLogout }) {
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [goals, setGoals] = useState({ dailySteps: '', dailyCalories: '' });
    const [profile, setProfile] = useState({ height: '', weight: '', birthYear: '', gender: '' });
    const [weightHistory, setWeightHistory] = useState([]);
    const [newWeight, setNewWeight] = useState('');
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);

    async function loadAll() {
        const [me, g, p, s] = await Promise.allSettled([fetchMe(), fetchGoals(), fetchProfile(), fetchSummary()]);

        if (me.status === 'fulfilled') {
            setEmail(me.value.data.email || '');
            setUserName(me.value.data.name || '');
        }

        if (g.status === 'fulfilled') {
            const gd = g.value.data.data || g.value.data;
            setGoals({
                dailySteps: gd.dailySteps ?? 10000,
                dailyCalories: gd.dailyCalories ?? 500,
            });
        }

        if (p.status === 'fulfilled') {
            const pd = p.value.data.data || p.value.data;
            const pr = pd.profile || {};
            setProfile({
                height: pr.height ?? '',
                weight: pr.weight ?? '',
                birthYear: pr.birthYear ?? '',
                gender: pr.gender ?? '',
            });
            setWeightHistory(pd.weightHistory || []);
        } else {
            setNotice({ msg: 'Профиль недоступен — перезапустите сервер', ok: false });
        }

        if (s.status === 'fulfilled') {
            const sd = s.value.data.data || s.value.data;
            setAchievements(sd.achievements || []);
        }

        setLoading(false);
    }

    useEffect(() => { loadAll(); }, []);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 3000);
        return () => clearTimeout(t);
    }, [notice]);

    async function saveGoals(e) {
        e.preventDefault();
        try {
            await updateGoals({ dailySteps: Number(goals.dailySteps), dailyCalories: Number(goals.dailyCalories) });
            setNotice({ msg: 'Цели сохранены', ok: true });
        } catch { setNotice({ msg: 'Ошибка сохранения целей', ok: false }); }
    }

    async function saveProfile(e) {
        e.preventDefault();
        try {
            const res = await updateProfile(profile);
            setNotice({ msg: 'Профиль сохранён', ok: true });
            const saved = res.data.data || res.data;
            if (saved) {
                setProfile((p) => ({ ...p, ...saved }));
            }
        } catch { setNotice({ msg: 'Ошибка сохранения профиля', ok: false }); }
    }

    async function submitWeight(e) {
        e.preventDefault();
        const v = Number(newWeight);
        if (newWeight === '' || v <= 0 || v > 400) {
            setNotice({ msg: 'Введите корректный вес (от 1 до 400 кг)', ok: false });
            return;
        }
        try {
            await addWeight({ weight: v });
            setNewWeight('');
            setProfile((p) => ({ ...p, weight: v }));
            setNotice({ msg: 'Вес добавлен', ok: true });
            loadAll();
        } catch { setNotice({ msg: 'Ошибка добавления веса', ok: false }); }
    }

    if (loading) {
        return <div className="loader"><div className="spinner"></div><p>Загрузка профиля…</p></div>;
    }

    // ИМТ (BMI)
    const h = Number(profile.height);
    const w = Number(profile.weight);
    const bmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)) : null;
    const bmiLabel = bmi == null ? '' :
        bmi < 18.5 ? 'недостаток веса' : bmi < 25 ? 'норма' : bmi < 30 ? 'избыток' : 'ожирение';

    // Данные для линейного графика веса (последние 14 записей)
    const chartData = weightHistory.slice(-14);
    const weights = chartData.map((e) => e.weight);
    const maxW = weights.length ? Math.max(...weights) : 1;
    const minW = weights.length ? Math.min(...weights) : 0;

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Профиль</h2>
                    <p className="subtitle">{userName || email}</p>
                </div>
            </section>

            <div className="dash-grid">
                {/* Цели */}
                <section className="card">
                    <h3>Дневные цели</h3>
                    <form className="goals-form" onSubmit={saveGoals}>
                        <div className="field">
                            <label>Шаги в день</label>
                            <input type="number" min="1" max="100000" step="1" value={goals.dailySteps}
                                onChange={(e) => setGoals({ ...goals, dailySteps: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Калории в день</label>
                            <input type="number" min="1" max="20000" step="1" value={goals.dailyCalories}
                                onChange={(e) => setGoals({ ...goals, dailyCalories: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'end' }}>Сохранить</button>
                    </form>
                </section>

                {/* Физические параметры */}
                <section className="card">
                    <h3>Физические параметры</h3>
                    <div className="profile-edit-wrap">
                        <form onSubmit={saveProfile}>
                            <div className="profile-edit-grid">
                                <div className="profile-edit-field">
                                    <label>Рост, см</label>
                                    <input type="number" min="50" max="250" step="1" value={profile.height}
                                        onChange={(e) => setProfile({ ...profile, height: e.target.value })} />
                                </div>
                                <div className="profile-edit-field">
                                    <label>Вес, кг</label>
                                    <input type="number" min="20" max="400" step="0.1" value={profile.weight}
                                        onChange={(e) => setProfile({ ...profile, weight: e.target.value })} />
                                </div>
                                <div className="profile-edit-field">
                                    <label>Год рождения</label>
                                    <input type="number" min="1900" max="2026" value={profile.birthYear}
                                        onChange={(e) => setProfile({ ...profile, birthYear: e.target.value })} />
                                </div>
                                <div className="profile-edit-field">
                                    <label>Пол</label>
                                    <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                                        <option value="">—</option>
                                        <option value="male">Мужской</option>
                                        <option value="female">Женский</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
                                <button type="submit" className="btn btn-primary">Сохранить</button>
                                {bmi != null && (
                                    <span className="subtitle" style={{ margin: 0 }}>
                                        ИМТ (BMI): <b style={{ color: 'var(--text)' }}>{bmi.toFixed(1)}</b> — {bmiLabel}
                                    </span>
                                )}
                            </div>
                        </form>
                    </div>
                </section>
            </div>

            {/* История веса */}
            <section className="card">
                <h3>История веса</h3>
                <form className="form" onSubmit={submitWeight} style={{ marginBottom: 16 }}>
                    <div className="field">
                        <label>Добавить текущий вес, кг</label>
                        <input type="number" min="20" max="400" step="0.1" placeholder="например, 72.5"
                            value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary">Добавить</button>
                </form>

                {weightHistory.length === 0 ? (
                    <p className="subtitle">Пока нет записей веса.</p>
                ) : (
                    <>
                        {/* Линейный SVG-график */}
                        <WeightLineChart data={chartData} minW={minW} maxW={maxW} />
                        <p className="subtitle" style={{ marginTop: 8 }}>
                            Записей: {weightHistory.length}. Последний вес: <b>{nf(weightHistory[weightHistory.length - 1].weight)} кг</b>
                        </p>
                    </>
                )}
            </section>

            {/* Достижения */}
            <section className="card">
                <h3>Достижения ({achievements.length})</h3>
                {achievements.length === 0 ? (
                    <p className="subtitle">Пока нет — добавляйте активности, чтобы получить бейджи!</p>
                ) : (
                    <div className="ach-grid">
                        {achievements.map((a) => (
                            <div className="ach-card" key={a.code || a._id}>
                                <span className="ach-card-icon">{ACH_ICONS[a.code] || '🏆'}</span>
                                <span className="ach-card-title">{a.title}</span>
                                <span className="ach-card-date">{new Date(a.earnedAt).toLocaleDateString('ru-RU')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {notice && <div className={'notice' + (notice.ok ? ' notice-ok' : '')}>{notice.msg}</div>}
        </>
    );
}

/* ——— Линейный SVG-график веса ——— */
function WeightLineChart({ data, minW, maxW }) {
    if (!data.length) return null;

    const W = 600;           // ширина графика (viewBox)
    const H = 180;           // высота графика
    const padX = 48;         // отступ слева (для подписей оси Y)
    const padR = 16;         // отступ справа
    const padTop = 16;
    const padBot = 32;       // для подписей оси X
    const plotW = W - padX - padR;
    const plotH = H - padTop - padBot;

    const range = maxW - minW || 1;
    // добавим 5% запаса сверху/снизу для красоты
    const yMin = minW - range * 0.05;
    const yMax = maxW + range * 0.05;
    const yRange = yMax - yMin || 1;

    function x(i) { return padX + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW); }
    function y(val) { return padTop + plotH - ((val - yMin) / yRange) * plotH; }

    // Линия
    const points = data.map((e, i) => `${x(i).toFixed(1)},${y(e.weight).toFixed(1)}`);
    const polyline = points.join(' ');

    // Область заливки под линией
    const areaPath = `M ${x(0).toFixed(1)},${(padTop + plotH).toFixed(1)} ` +
        data.map((e, i) => `L ${x(i).toFixed(1)},${y(e.weight).toFixed(1)}`).join(' ') +
        ` L ${x(data.length - 1).toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;

    // Y-ось: 4 горизонтальные линии
    const yTicks = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
        const val = minW + (range * i) / tickCount;
        yTicks.push(val);
    }

    return (
        <div className="weight-chart-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="weight-chart-svg" preserveAspectRatio="xMidYMid meet">
                {/* Горизонтальные линии сетки */}
                {yTicks.map((val, i) => (
                    <g key={i}>
                        <line x1={padX} y1={y(val)} x2={W - padR} y2={y(val)}
                            stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 3" />
                        <text x={padX - 6} y={y(val) + 4} textAnchor="end"
                            fill="var(--text)" fontSize="10" opacity="0.7">{val.toFixed(1)}</text>
                    </g>
                ))}

                {/* Заливка под графиком */}
                <path d={areaPath} fill="url(#weightGrad)" opacity="0.3" />

                {/* Линия графика */}
                <polyline points={polyline} fill="none" stroke="#22c55e" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />

                {/* Точки + подписи оси X */}
                {data.map((e, i) => {
                    const cx = x(i);
                    const cy = y(e.weight);
                    const dateLabel = new Date(e.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                    return (
                        <g key={i}>
                            <circle cx={cx} cy={cy} r="4" fill="#22c55e" stroke="var(--card)" strokeWidth="2" />
                            {/* Значение над точкой */}
                            <text x={cx} y={cy - 10} textAnchor="middle"
                                fill="var(--text)" fontSize="10" fontWeight="600">{e.weight}</text>
                            {/* Дата под осью */}
                            <text x={cx} y={H - 4} textAnchor="middle"
                                fill="var(--text)" fontSize="9" opacity="0.7">{dateLabel}</text>
                        </g>
                    );
                })}

                {/* Градиент для заливки */}
                <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
