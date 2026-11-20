import { NavLink } from 'react-router-dom';
import Icon from './Icon';

const LINKS = [
    { to: '/', label: 'Дашборд', icon: 'home', end: true },
    { to: '/activities', label: 'Активности', icon: 'activity' },
    { to: '/feed', label: 'Лента', icon: 'bell' },
    { to: '/profile', label: 'Профиль', icon: 'user' },
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
                        <span className="nav-icon"><Icon name={l.icon} size={18} /></span>
                        <span className="nav-label">{l.label}</span>
                    </NavLink>
                ))}
            </nav>

            <button className="btn btn-ghost logout-btn" onClick={onLogout}>Выйти</button>
        </header>
    );
}
