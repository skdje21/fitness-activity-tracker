const request = require('supertest');
const app = require('../server');

const TEST_USER = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123',
    name: 'Test User',
};

let token;

describe('POST /auth/register', () => {
    it('регистрирует нового пользователя', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send(TEST_USER);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', TEST_USER.email);
    });

    it('не регистрирует дубликат email', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send(TEST_USER);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('отклоняет пустой пароль', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'no@pass.com', password: '', name: 'No' });
        expect(res.statusCode).toBe(400);
    });

    it('отклоняет короткий пароль', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'short@pass.com', password: '123', name: 'Short' });
        expect(res.statusCode).toBe(400);
    });
});

describe('POST /auth/login', () => {
    it('логинит с правильными данными', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        token = res.body.token;
    });

    it('отклоняет неверный пароль', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong' });
        expect(res.statusCode).toBe(401);
    });

    it('отклоняет несуществующий email', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'nobody@example.com', password: 'whatever' });
        expect(res.statusCode).toBe(401);
    });
});

describe('GET /activities (без токена)', () => {
    it('возвращает 401 без авторизации', async () => {
        const res = await request(app).get('/activities');
        expect(res.statusCode).toBe(401);
    });
});

describe('GET /auth/profile', () => {
    it('возвращает профиль с валидным токеном', async () => {
        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('email', TEST_USER.email);
    });

    it('отклоняет невалидный токен', async () => {
        const res = await request(app)
            .get('/auth/profile')
            .set('Authorization', 'Bearer invalidtoken123');
        expect(res.statusCode).toBe(401);
    });
});

describe('DELETE /auth/me (удаление тестового пользователя)', () => {
    it('удаляет аккаунт', async () => {
        const res = await request(app)
            .delete('/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
    });
});
