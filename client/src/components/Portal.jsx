import { createPortal } from 'react-dom';

// Рендерит содержимое прямо в <body>, минуя контекст наложения родителя.
// Без этого модалка «запирается» внутри .page и липкий хэдер перекрывает её сверху.
export default function Portal({ children }) {
    return createPortal(children, document.body);
}
