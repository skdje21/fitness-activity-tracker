import NotificationFeed from '../NotificationFeed';

export default function FeedPage({ token }) {
    return (
        <>
            <section className="page-head">
                <div>
                    <h2 className="page-title">Лента активности</h2>
                    <p className="subtitle">События пользователей в реальном времени (WebSocket)</p>
                </div>
            </section>
            <NotificationFeed token={token} />
        </>
    );
}
