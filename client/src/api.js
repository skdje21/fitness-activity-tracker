import axios from 'axios';

// Создаём отдельный экземпляр axios с общими настройками.
// baseURL берётся из переменной окружения Vite (файл .env: VITE_API_URL=http://localhost:3000).
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Перехватчик (interceptor) запроса: выполняется ПЕРЕД отправкой каждого запроса.
// Если в localStorage есть JWT-токен — подставляем его в заголовок Authorization.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config; // обязательно возвращаем config, иначе запрос не уйдёт
});

// --- CRUD-функции для ресурса /activities ---

// Чтение всех записей. Необязательный параметр search → добавляется как query-параметр ?search=...
export const fetchActivities = (search = '') =>
    api.get('/activities', { params: search ? { search } : {} });

// Создание новой записи (POST с телом activity).
export const addActivity = (activity) => api.post('/activities', activity);

// Обновление записи по id (PUT с новыми данными).
export const updateActivity = (id, updated) => api.put(`/activities/${id}`, updated);

// Удаление записи по id (DELETE).
export const deleteActivity = (id) => api.delete(`/activities/${id}`);

export default api;
