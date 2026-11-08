import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { logout } from './api';
import AuthForm from './AuthForm';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

function App() {
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    function handleLogout() {
        logout();
        setToken(null);
    }

    if (!token) {
        return <AuthForm onAuth={setToken} />;
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
