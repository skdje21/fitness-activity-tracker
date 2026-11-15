import { NavLink } from 'react-router-dom';

const LINKS = [
    { to: '/', label: 'Дашборд', icon: '📊', end: true },
    { to: '/activities', label: 'Активности', icon: '🏃' },
    { to: '/feed', label: 'Лента', icon: '🔔' },
    { to: '/profile', label: 'Профиль', icon: '👤' },
];

export default function Navbar({ onLogout }) {
    return (
        <header className="navbar">
            <div className="navbar-brand">
                <span className="navbar-title">FITNESS TRACKER</span>
            </div>

            <nav className="navbar-links">
                {LINKS.map((l) => (
                    <NavLink
                        key={l.to}
                        to={l.to}
                        end={l.end}
                        className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                    >
                        <span className="nav-icon">{l.icon}</span>
                        <span className="nav-label">{l.label}</span>
                    </NavLink>
                ))}
            </nav>

            <button className="btn btn-ghost logout-btn" onClick={onLogout}>Выйти</button>
        </header>
    );
}
