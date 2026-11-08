import { useState } from 'react';
import { login, register, saveToken, forgotPassword, resetPassword } from './api';


function AuthForm({ onAuth }) {
    // mode: 'login' | 'register' | 'forgot' | 'reset'
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    function switchMode(m) {
        setMode(m);
        setError(null);
        setInfo(null);
        setCode('');
        setNewPassword('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setInfo(null);

        if (mode === 'forgot') {
            if (!email) { setError('Введите email'); return; }
            setLoading(true);
            try {
                const res = await forgotPassword(email);
                setInfo(res.data.message || 'Код отправлен');
                setMode('reset');
            } catch (err) {
                setError(err.response?.data?.error || 'Ошибка сервера');
            } finally { setLoading(false); }
            return;
        }

        if (mode === 'reset') {
            if (!code || !newPassword) { setError('Заполните все поля'); return; }
            if (newPassword.length < 6) { setError('Пароль должен быть не короче 6 символов'); return; }
            setLoading(true);
            try {
                const res = await resetPassword(email, code, newPassword);
                setInfo(res.data.message || 'Пароль изменён');
                setTimeout(() => switchMode('login'), 1500);
            } catch (err) {
                setError(err.response?.data?.error || 'Ошибка сервера');
            } finally { setLoading(false); }
            return;
        }

        // login / register
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

    const titles = { login: 'Вход', register: 'Регистрация', forgot: 'Сброс пароля', reset: 'Новый пароль' };

    return (
        <div className="app">
            <div className="auth-wrap">
                <div className="card auth-card">
                    <div className="auth-logo">🏃</div>
                    <h2>{titles[mode]}</h2>
                    <p className="auth-sub">Трекер физической активности</p>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Email — всегда кроме reset (там фиксирован) */}
                        {mode !== 'reset' && (
                            <div className="field">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Пароль — login / register */}
                        {(mode === 'login' || mode === 'register') && (
                            <div className="field">
                                <label>Пароль</label>
                                <input
                                    type="password"
                                    placeholder="минимум 6 символов"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Forgot: подсказка */}
                        {mode === 'forgot' && (
                            <p className="subtitle" style={{ margin: '0 0 8px' }}>
                                Введите email, на который зарегистрирован аккаунт. Код подтверждения будет отправлен.
                            </p>
                        )}

                        {/* Reset: код + новый пароль */}
                        {mode === 'reset' && (
                            <>
                                <p className="subtitle" style={{ margin: '0 0 8px' }}>
                                    Код отправлен на <b>{email}</b>
                                </p>
                                <div className="field">
                                    <label>Код подтверждения</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="6-значный код"
                                        value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        autoComplete="one-time-code"
                                    />
                                </div>
                                <div className="field">
                                    <label>Новый пароль</label>
                                    <input
                                        type="password"
                                        placeholder="минимум 6 символов"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {error && <div className="auth-error">{error}</div>}
                        {info && <div className="auth-info">{info}</div>}

                        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                            {loading ? 'Подождите…' :
                                mode === 'login' ? 'Войти' :
                                mode === 'register' ? 'Зарегистрироваться' :
                                mode === 'forgot' ? 'Отправить код' :
                                'Установить пароль'}
                        </button>
                    </form>

                    {/* Нижние ссылки */}
                    <div className="auth-bottom">
                        {(mode === 'login' || mode === 'register') && (
                            <p className="auth-switch">
                                {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                                <button type="button" className="auth-link" style={{ marginLeft: 8 }}
                                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                                    {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                                </button>
                            </p>
                        )}
                        {mode === 'login' && (
                            <p className="auth-switch">
                                <button type="button" className="auth-link auth-link-muted" onClick={() => switchMode('forgot')}>
                                    Забыли пароль?
                                </button>
                            </p>
                        )}
                        {(mode === 'forgot' || mode === 'reset') && (
                            <p className="auth-switch">
                                <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                                    ← Назад ко входу
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthForm;
