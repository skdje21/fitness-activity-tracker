import axios from 'axios';


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// При 401 с просроченным/битым токеном — очищаем токен и возвращаем на экран входа
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadToken = !!localStorage.getItem('token');
        const url = (error.config && error.config.url) || '';
        if (error.response && error.response.status === 401 && hadToken && !url.includes('/auth/')) {
            localStorage.removeItem('token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);


export const fetchActivities = (search = '') =>
    api.get('/activities', { params: search ? { search } : {} });

export const addActivity = (activity) => api.post('/activities', activity);

export const updateActivity = (id, updated) => api.put(`/activities/${id}`, updated);

export const deleteActivity = (id) => api.delete(`/activities/${id}`);

// ---------- Дашборд (статистика, цели) ----------
export const fetchSummary = () => api.get('/dashboard/summary');

export const fetchGoals = () => api.get('/dashboard/goals');

export const updateGoals = (goals) => api.put('/dashboard/goals', goals);

// ---------- Профиль пользователя ----------
export const fetchMe = () => api.get('/auth/profile');

export const fetchProfile = () => api.get('/dashboard/profile');

export const updateProfile = (data) => api.put('/dashboard/profile', data);

export const addWeight = (entry) => api.post('/dashboard/weight', entry);

// ---------- Аутентификация ----------
export const register = (email, password) => api.post('/auth/register', { email, password });

export const login = (email, password) => api.post('/auth/login', { email, password });

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });

export const resetPassword = (email, code, newPassword) =>
    api.post('/auth/reset-password', { email, code, newPassword });

export function saveToken(token) {
    localStorage.setItem('token', token);
}

export function logout() {
    localStorage.removeItem('token');
}

export default api;
