import Icon from './Icon';

// Шапка админ-режима: никаких пользовательских разделов — только бренд и выход.
export default function AdminNavbar({ onLogout, email }) {
    return (
        <header className="navbar admin-navbar">
            <div className="navbar-brand">
                <span className="navbar-title">FITNESS TRACKER</span>
            </div>

            <span className="admin-badge admin-navbar-badge">
                <Icon name="shield" size={14} />
                <span className="admin-badge-text">{email || 'Администратор'}</span>
            </span>

            <button className="btn btn-ghost logout-btn" onClick={onLogout}>Выйти</button>
        </header>
    );
}
