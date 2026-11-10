import { useState, useEffect } from 'react';
import NotificationFeed from '../NotificationFeed';
import { fetchLeaderboard } from '../api';

const PERIODS = [
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'all', label: 'Всё время' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function nf(n) { return Number(n || 0).toLocaleString('ru-RU'); }

function maskEmail(email) {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const visible = name.slice(0, 3);
    return `${visible}***@${domain}`;
}

export default function FeedPage({ token }) {
    const [period, setPeriod] = useState('week');
    const [board, setBoard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchLeaderboard(period)
            .then(r => setBoard(r.data.data || r.data || []))
            .catch(() => setBoard([]))
            .finally(() => setLoading(false));
    }, [period]);

    // Determine current user id from token
    let myId = null;
    try {
        myId = JSON.parse(atob(token.split('.')[1])).id;
    } catch { /* ignore */ }

    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Лента активности</h2>
                    <p className="subtitle">События пользователей в реальном времени (WebSocket)</p>
                </div>
            </section>

            <NotificationFeed token={token} />

            {/* Лидерборд */}
            <section className="card">
                <div className="card-head">
                    <h3>Рейтинг пользователей</h3>
                    <div className="range-btns">
                        {PERIODS.map(p => (
                            <button key={p.key} className={'range-btn' + (period === p.key ? ' active' : '')} onClick={() => setPeriod(p.key)}>{p.label}</button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <p className="subtitle">Загрузка…</p>
                ) : board.length === 0 ? (
                    <p className="subtitle">Пока нет данных за этот период</p>
                ) : (
                    <div className="leaderboard">
                        {board.map((row, i) => {
                            const isMe = row.id === myId;
                            return (
                                <div key={row.id} className={'lb-row' + (isMe ? ' lb-me' : '')}>
                                    <span className="lb-rank">{MEDALS[i] || `#${i + 1}`}</span>
                                    <span className="lb-user">
                                        {row.name || maskEmail(row.email)}
                                        {isMe && <span className="lb-you">вы</span>}
                                    </span>
                                    <div className="lb-stats">
                                        <span className="lb-stat">👟 {nf(row.totalSteps)}</span>
                                        <span className="lb-stat">🔥 {nf(row.totalCalories)}</span>
                                        <span className="lb-stat">📅 {row.activeDays} дн.</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
}
