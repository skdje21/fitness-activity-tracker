import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';


const ICONS = { join: '🟢', leave: '🔴', activity: '🏃', achievement: '🏆' };

// Достаём email из JWT-токена (payload — средняя часть, закодирована base64url)
function userFromToken(token) {
    try {
        return JSON.parse(atob(token.split('.')[1])).email || 'Пользователь';
    } catch {
        return 'Пользователь';
    }
}

export default function NotificationFeed({ token }) {
    const [connected, setConnected] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [notes, setNotes] = useState([]);
    const [online, setOnline] = useState(0);
    const [steps, setSteps] = useState('');
    const [type, setType] = useState('Бег');
    const socketRef = useRef(null);
    const feedRef = useRef(null);

    const user = token ? userFromToken(token) : '';

    // Подключаемся автоматически, передавая JWT-токен при handshake
    useEffect(() => {
        if (!token) return;

        const socket = io('http://localhost:3000', { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => { setConnected(true); setAuthError(null); });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (err) => setAuthError(err.message));

        socket.on('history', (list) => setNotes(list));
        socket.on('notification', (note) => setNotes(prev => [...prev, note]));
        socket.on('onlineCount', (n) => setOnline(n));

        return () => socket.disconnect();
    }, [token]);

    // Автопрокрутка ленты вниз при новом событии
    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }, [notes]);

    function sendActivity() {
        if (steps === '' || !socketRef.current) return;
        socketRef.current.emit('activity', { type, steps: Number(steps) });
        setSteps('');
    }

    function sendAchievement() {
        if (!socketRef.current) return;
        socketRef.current.emit('achievement', { title: '10 000 шагов за день' });
    }

    return (
        <section className="card">
            <h2>🔔 Лента активности (реальное время)</h2>

            {authError ? (
                <p className="auth-error">Не удалось подключиться к ленте: {authError}</p>
            ) : (
                <>
                    <p className="subtitle">
                        Вы вошли как <b>{user}</b> ·{' '}
                        {connected ? <>онлайн: <b>{online}</b></> : 'подключение…'}
                    </p>

                    {/* Отправка событий */}
                    <div className="form" style={{ marginBottom: 12 }}>
                        <div className="field">
                            <label>Тип активности</label>
                            <select value={type} onChange={e => setType(e.target.value)}>
                                <option>Бег</option>
                                <option>Ходьба</option>
                                <option>Велосипед</option>
                                <option>Хайкинг</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Шаги</label>
                            <input
                                type="number" min="0" placeholder="0"
                                value={steps}
                                onChange={e => setSteps(e.target.value)}
                            />
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-primary" onClick={sendActivity} disabled={!connected}>
                                Отправить активность
                            </button>
                            <button className="btn btn-ghost" onClick={sendAchievement} disabled={!connected}>
                                🏆 Достижение
                            </button>
                        </div>
                    </div>

                    {/* Лента уведомлений */}
                    <div
                        ref={feedRef}
                        style={{
                            maxHeight: 260, overflowY: 'auto',
                            border: '1px solid #e5e7eb', borderRadius: 8, padding: 8,
                        }}
                    >
                        {notes.length === 0 ? (
                            <p className="subtitle">Пока нет событий…</p>
                        ) : (
                            notes.map((n, i) => (
                                <div key={n._id || i} style={{ padding: '6px 4px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ marginRight: 8 }}>{ICONS[n.type] || '•'}</span>
                                    <span>{n.text}</span>
                                    <span className="subtitle" style={{ marginLeft: 8, fontSize: 12 }}>
                                        {new Date(n.createdAt).toLocaleTimeString('ru-RU')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
