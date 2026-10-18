import { useState, useEffect } from 'react';

// Пользовательский хук: синхронизирует состояние с localStorage.
// key — ключ в localStorage, initialValue — значение по умолчанию.
export default function useLocalStorage(key, initialValue) {
    // Ленивая инициализация: функция выполнится ОДИН раз при монтировании.
    // Читаем значение из localStorage; если его нет — берём initialValue.
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : initialValue;
        } catch {
            return initialValue; // на случай повреждённых данных
        }
    });

    // Сохраняем в localStorage при каждом изменении value.
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Ошибка записи в localStorage:', e);
        }
    }, [key, value]);

    return [value, setValue];
}
