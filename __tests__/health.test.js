const request = require('supertest');
const app = require('../server');

describe('GET /health', () => {
    it('возвращает статус ok', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });
});

describe('GET / (корневой маршрут)', () => {
    it('возвращает информацию об API', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('name');
        expect(res.body).toHaveProperty('resource', '/activities');
    });
});

describe('Несуществующий маршрут', () => {
    it('возвращает 404', async () => {
        const res = await request(app).get('/nonexistent-route');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
    });
});
