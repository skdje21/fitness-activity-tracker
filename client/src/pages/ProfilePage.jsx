import { useState, useEffect } from 'react';
import { fetchMe, fetchGoals, updateGoals, fetchProfile, updateProfile, addWeight } from '../api';

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

const GENDER_LABEL = { male: 'Мужской', female: 'Женский' };

export default function ProfilePage({ onLogout }) {
    const [email, setEmail] = useState('');
    const [goals, setGoals] = useState({ dailySteps: '', dailyCalories: '' });
    const [profile, setProfile] = useState({ height: '', weight: '', birthYear: '', gender: '' });
    const [editProfile, setEditProfile] = useState(null);       // null = режим просмотра
    const [weightHistory, setWeightHistory] = useState([]);
    const [newWeight, setNewWeight] = useState('');
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);

    async function loadAll() {
        const [me, g, p] = await Promise.allSettled([fetchMe(), fetchGoals(), fetchProfile()]);

        if (me.status === 'fulfilled') setEmail(me.value.data.email || '');

        if (g.status === 'fulfilled') {
            setGoals({
                dailySteps: g.value.data.dailySteps ?? 10000,
                dailyCalories: g.value.data.dailyCalories ?? 500,
            });
        }

        if (p.status === 'fulfilled') {
            const pr = p.value.data.profile || {};
            setProfile({
                height: pr.height ?? '',
                weight: pr.weight ?? '',
                birthYear: pr.birthYear ?? '',
                gender: pr.gender ?? '',
            });
            setWeightHistory(p.value.data.weightHistory || []);
        } else {
            setNotice({ msg: 'Профиль недоступен — перезапустите сервер', ok: false });
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

    function startEditProfile() {
        setEditProfile({ ...profile });
    }

    async function saveProfile(e) {
        e.preventDefault();
        try {
            const res = await updateProfile(editProfile);
            setNotice({ msg: 'Профиль сохранён', ok: true });
            const saved = res.data || editProfile;
            setProfile({
                height: saved.height ?? editProfile.height,
                weight: saved.weight ?? editProfile.weight,
                birthYear: saved.birthYear ?? editProfile.birthYear,
                gender: saved.gender ?? editProfile.gender,
            });
            setEditProfile(null);
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

    const hasSavedProfile = profile.height || profile.weight || profile.birthYear || profile.gender;
    const isEditing = editProfile !== null;

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
                    <p className="subtitle">{email}</p>
                </div>
            </section>

            <div className="dash-grid">
                {/* Цели */}
                <section className="card">
                    <h3>Дневные цели</h3>
                    <form className="form" onSubmit={saveGoals}>
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
                        <button type="submit" className="btn btn-primary">Сохранить цели</button>
                    </form>
                </section>

                {/* Физические параметры */}
                <section className="card">
                    <h3>Физические параметры</h3>

                    {!isEditing ? (
                        /* --- Режим просмотра --- */
                        <>
                            {hasSavedProfile ? (
                                <div className="profile-view">
                                    <div className="profile-row">
                                        <span className="profile-label">Рост</span>
                                        <span className="profile-value">{profile.height ? `${profile.height} см` : '—'}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Вес</span>
                                        <span className="profile-value">{profile.weight ? `${profile.weight} кг` : '—'}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Год рождения</span>
                                        <span className="profile-value">{profile.birthYear || '—'}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Пол</span>
                                        <span className="profile-value">{GENDER_LABEL[profile.gender] || '—'}</span>
                                    </div>
                                    {bmi != null && (
                                        <div className="profile-row">
                                            <span className="profile-label">ИМТ (BMI)</span>
                                            <span className="profile-value"><b>{bmi.toFixed(1)}</b> — {bmiLabel}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="subtitle">Параметры не заполнены</p>
                            )}
                            <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={startEditProfile}>
                                Редактировать
                            </button>
                        </>
                    ) : (
                        /* --- Режим редактирования --- */
                        <div className="profile-edit-wrap">
                            <form onSubmit={saveProfile}>
                                <div className="profile-edit-grid">
                                    <div className="profile-edit-field">
                                        <label>Рост, см</label>
                                        <input type="number" min="50" max="250" step="1" value={editProfile.height}
                                            onChange={(e) => setEditProfile({ ...editProfile, height: e.target.value })} />
                                    </div>
                                    <div className="profile-edit-field">
                                        <label>Вес, кг</label>
                                        <input type="number" min="20" max="400" step="0.1" value={editProfile.weight}
                                            onChange={(e) => setEditProfile({ ...editProfile, weight: e.target.value })} />
                                    </div>
                                    <div className="profile-edit-field">
                                        <label>Год рождения</label>
                                        <input type="number" min="1900" max="2026" value={editProfile.birthYear}
                                            onChange={(e) => setEditProfile({ ...editProfile, birthYear: e.target.value })} />
                                    </div>
                                    <div className="profile-edit-field">
                                        <label>Пол</label>
                                        <select value={editProfile.gender} onChange={(e) => setEditProfile({ ...editProfile, gender: e.target.value })}>
                                            <option value="">—</option>
                                            <option value="male">Мужской</option>
                                            <option value="female">Женский</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ marginTop: 14 }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setEditProfile(null)}>Отмена</button>
                                    <button type="submit" className="btn btn-primary">Сохранить</button>
                                </div>
                            </form>
                        </div>
                    )}
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
                            fill="var(--text-muted)" fontSize="10">{val.toFixed(1)}</text>
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
                                fill="var(--text-muted)" fontSize="9">{dateLabel}</text>
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
