import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { logout, fetchMe } from './api';
import AuthForm from './AuthForm';
import Navbar from './components/Navbar';
import AdminNavbar from './components/AdminNavbar';
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import './App.css';

function App() {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [me, setMe] = useState(null);
    const [loadingMe, setLoadingMe] = useState(false);

    // Текущий пользователь (нужна роль, чтобы показать админку)
    useEffect(() => {
        if (!token) { setMe(null); return; }
        let alive = true;
        setLoadingMe(true);
        fetchMe()
            .then((r) => { if (alive) setMe(r.data); })
            .catch(() => { if (alive) setMe(null); })
            .finally(() => { if (alive) setLoadingMe(false); });
        return () => { alive = false; };
    }, [token]);

    async function handleLogout() {
        await logout();
        setMe(null);
        setToken(null);
    }

    if (!token) {
        return <AuthForm onAuth={setToken} />;
    }

    if (loadingMe && !me) {
        return (
            <div className="app">
                <div className="loader"><div className="spinner"></div><p>Загрузка…</p></div>
            </div>
        );
    }

    // Администратор видит только панель управления — пользовательских разделов у него нет
    if (me?.role === 'admin') {
        return (
            <div className="app admin-mode">
                <AdminNavbar onLogout={handleLogout} email={me.email} />
                <main className="page">
                    <Routes>
                        <Route path="/admin" element={<AdminPage me={me} />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <Navbar onLogout={handleLogout} />
            <main className="page">
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/activities" element={<ActivitiesPage />} />
                    <Route path="/feed" element={<FeedPage token={token} />} />
                    <Route path="/profile" element={<ProfilePage onLogout={handleLogout} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
