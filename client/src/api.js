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


export const fetchActivities = (search = '') =>
    api.get('/activities', { params: search ? { search } : {} });

export const addActivity = (activity) => api.post('/activities', activity);

export const updateActivity = (id, updated) => api.put(`/activities/${id}`, updated);

export const deleteActivity = (id) => api.delete(`/activities/${id}`);

export default api;
