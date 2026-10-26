import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Иконка уведомления по типу события
const ICONS = { join: '🟢', leave: '🔴', activity: '🏃', achievement: '🏆' };

export default function NotificationFeed() {
    const [name, setName] = useState('');        // имя пользователя
    const [connected, setConnected] = useState(false);
    const [notes, setNotes] = useState([]);      // лента уведомлений
    const [online, setOnline] = useState(0);     // сколько сейчас онлайн
    const [steps, setSteps] = useState('');      // поле «шаги»
    const [type, setType] = useState('Бег');     // тип активности
    const socketRef = useRef(null);              // ссылка на сокет
    const feedRef = useRef(null);                // для автопрокрутки ленты

    // Подключение к серверу Socket.IO
    function connect() {
        if (!name.trim() || connected) return;
        // Имя передаётся серверу при подключении через auth (handshake)
        const socket = io('http://localhost:3000', { auth: { user: name.trim() } });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        // История последних уведомлений (приходит один раз при подключении)
        socket.on('history', (list) => setNotes(list));
        // Новое уведомление — добавляем в конец ленты
        socket.on('notification', (note) => setNotes(prev => [...prev, note]));
        // Обновление счётчика онлайн
        socket.on('onlineCount', (n) => setOnline(n));
    }

    // Отключаемся при размонтировании компонента
    useEffect(() => () => socketRef.current && socketRef.current.disconnect(), []);

    // Автопрокрутка ленты вниз при новом уведомлении
    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }, [notes]);

    // Отправка активности на сервер
    function sendActivity() {
        if (steps === '' || !socketRef.current) return;
        socketRef.current.emit('activity', { type, steps: Number(steps) });
        setSteps('');
    }

    // Отправка достижения на сервер
    function sendAchievement() {
        if (!socketRef.current) return;
        socketRef.current.emit('achievement', { title: '10 000 шагов за день' });
    }

    return (
        <section className="card">
            <h2>🔔 Лента активности (реальное время)</h2>

            {!connected ? (
                // Экран входа: вводим имя и подключаемся
                <div className="form">
                    <div className="field">
                        <label>Ваше имя</label>
                        <input
                            type="text"
                            placeholder="Введите имя…"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && connect()}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={connect}>Подключиться</button>
                </div>
            ) : (
                <>
                    <p className="subtitle">
                        Вы вошли как <b>{name}</b> · онлайн: <b>{online}</b>
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
                            <button className="btn btn-primary" onClick={sendActivity}>
                                Отправить активность
                            </button>
                            <button className="btn btn-ghost" onClick={sendAchievement}>
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
