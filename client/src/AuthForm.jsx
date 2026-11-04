import { useState } from 'react';
import { login, register, saveToken } from './api';


function AuthForm({ onAuth }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!email || !password) { setError('Введите email и пароль'); return; }
        if (password.length < 6) { setError('Пароль должен быть не короче 6 символов'); return; }

        setLoading(true);
        try {
            if (mode === 'register') {
                await register(email, password);
            }

            const res = await login(email, password);
            saveToken(res.data.token);
            onAuth(res.data.token);
        } catch (err) {
            const msg = err.response?.data?.error || 'Ошибка сервера. Попробуйте позже.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="app">
            <div className="auth-wrap">
                <div className="card auth-card">
                    <div className="auth-logo">🏃</div>
                    <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
                    <p className="auth-sub">Трекер физической активности</p>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="field">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <label>Пароль</label>
                            <input
                                type="password"
                                placeholder="минимум 6 символов"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                            {loading ? 'Подождите…' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
                        </button>
                    </form>

                    <p className="auth-switch">
                        {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                        <button
                            type="button"
                            className="auth-link"
                            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
                        >
                            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AuthForm;
