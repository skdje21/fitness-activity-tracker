const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Fitness Activity Tracker API',
            version: '1.0.0',
            description:
                'REST API фитнес-трекера активностей. Позволяет регистрировать пользователей, ' +
                'отслеживать физическую активность, управлять целями, просматривать статистику ' +
                'и рейтинг. Данные хранятся в PostgreSQL (пользователи, активности) и MongoDB ' +
                '(профили, достижения, статистика по дням).',
            contact: { name: 'Р.А. Рудковский', email: 'support@fitness-tracker.local' },
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Локальный / Docker' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT-токен, полученный при POST /auth/login',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Описание ошибки' },
                    },
                },
                Activity: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        date: { type: 'string', format: 'date', example: '2026-11-15' },
                        type: { type: 'string', example: 'Бег' },
                        steps: { type: 'integer', example: 8500 },
                        calories: { type: 'number', example: 420 },
                        duration: { type: 'integer', example: 45, description: 'Минуты' },
                        userId: { type: 'integer', example: 1 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ActivityInput: {
                    type: 'object',
                    required: ['date', 'type', 'steps', 'calories'],
                    properties: {
                        date: { type: 'string', format: 'date', example: '2026-11-15' },
                        type: { type: 'string', maxLength: 50, example: 'Бег' },
                        steps: { type: 'integer', minimum: 0, maximum: 200000, example: 8500 },
                        calories: { type: 'number', minimum: 0, maximum: 50000, example: 420 },
                        duration: { type: 'integer', minimum: 0, maximum: 1440, example: 45 },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        name: { type: 'string', example: 'Иван' },
                    },
                },
                TokenResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                    },
                },
                Summary: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'object',
                            properties: {
                                totals: { type: 'object' },
                                today: {
                                    type: 'object',
                                    properties: {
                                        steps: { type: 'integer' },
                                        calories: { type: 'integer' },
                                    },
                                },
                                goals: {
                                    type: 'object',
                                    properties: {
                                        dailySteps: { type: 'integer', example: 10000 },
                                        dailyCalories: { type: 'integer', example: 500 },
                                    },
                                },
                                progress: {
                                    type: 'object',
                                    properties: {
                                        steps: { type: 'integer', example: 85 },
                                        calories: { type: 'integer', example: 60 },
                                    },
                                },
                                week: { type: 'object' },
                                series: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            date: { type: 'string' },
                                            steps: { type: 'integer' },
                                            calories: { type: 'integer' },
                                        },
                                    },
                                },
                                byType: { type: 'object' },
                                records: { type: 'object' },
                                achievements: { type: 'array', items: { type: 'object' } },
                            },
                        },
                    },
                },
                LeaderboardRow: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string' },
                        name: { type: 'string', nullable: true },
                        totalSteps: { type: 'integer', example: 42000 },
                        totalCalories: { type: 'integer', example: 3200 },
                        activeDays: { type: 'integer', example: 5 },
                    },
                },
                Goals: {
                    type: 'object',
                    properties: {
                        dailySteps: { type: 'integer', minimum: 1, maximum: 100000, example: 10000 },
                        dailyCalories: { type: 'integer', minimum: 1, maximum: 20000, example: 500 },
                    },
                },
                Profile: {
                    type: 'object',
                    properties: {
                        height: { type: 'number', example: 178, description: 'см' },
                        weight: { type: 'number', example: 75, description: 'кг' },
                        birthYear: { type: 'integer', example: 2004 },
                        gender: { type: 'string', enum: ['male', 'female'] },
                    },
                },
                Achievement: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        userId: { type: 'string' },
                        title: { type: 'string', example: '10 000 шагов' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                        icon: { type: 'string' },
                        earnedAt: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Регистрация, вход, выход, сброс пароля' },
            { name: 'Activities', description: 'CRUD активностей (шаги, калории, тип)' },
            { name: 'Dashboard', description: 'Сводка, графики, лидерборд, цели, профиль' },
            { name: 'MongoDB', description: 'Прямой доступ к Mongo-коллекциям (профиль, достижения, дневная статистика, вес)' },
            { name: 'System', description: 'Healthcheck и информация о сервере' },
        ],
        paths: {
            // ============ System ============
            '/': {
                get: {
                    tags: ['System'],
                    summary: 'Информация об API',
                    responses: { 200: { description: 'Имя и ресурс API' } },
                },
            },
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Healthcheck',
                    description: 'Используется Docker для проверки работоспособности backend',
                    responses: {
                        200: {
                            description: 'Сервер работает',
                            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } },
                        },
                    },
                },
            },

            // ============ Auth ============
            '/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Регистрация',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password', 'name'],
                                    properties: {
                                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                                        password: { type: 'string', minLength: 6, example: 'secret123' },
                                        name: { type: 'string', maxLength: 100, example: 'Иван' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Пользователь создан', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
                        400: { description: 'Ошибка валидации', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Вход (получение JWT)',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'JWT-токен', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
                        401: { description: 'Неверные данные', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        423: { description: 'Аккаунт заблокирован (превышены попытки входа)' },
                    },
                },
            },
            '/auth/logout': {
                post: {
                    tags: ['Auth'],
                    summary: 'Выход (отзыв токена через Redis)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Токен помещён в blacklist' },
                        401: { description: 'Не авторизован' },
                    },
                },
            },
            '/auth/forgot-password': {
                post: {
                    tags: ['Auth'],
                    summary: 'Запрос кода сброса пароля',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } } } } },
                    },
                    responses: { 200: { description: 'Если аккаунт существует — код отправлен' } },
                },
            },
            '/auth/reset-password': {
                post: {
                    tags: ['Auth'],
                    summary: 'Сброс пароля по коду',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'code', 'newPassword'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        code: { type: 'string', example: '482910' },
                                        newPassword: { type: 'string', minLength: 6 },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Пароль изменён' },
                        400: { description: 'Неверный/просроченный код' },
                    },
                },
            },
            '/auth/profile': {
                get: {
                    tags: ['Auth'],
                    summary: 'Текущий пользователь',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Профиль', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
                },
                put: {
                    tags: ['Auth'],
                    summary: 'Обновить имя',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', maxLength: 100 } } } } },
                    },
                    responses: { 200: { description: 'Обновлённый профиль' } },
                },
            },
            '/auth/me': {
                delete: {
                    tags: ['Auth'],
                    summary: 'Удалить аккаунт',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Аккаунт удалён' },
                        404: { description: 'Пользователь не найден' },
                    },
                },
            },

            // ============ Activities ============
            '/activities': {
                get: {
                    tags: ['Activities'],
                    summary: 'Список активностей (пагинация)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
                        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Поиск по типу (iLike)' },
                        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Фильтр по дате' },
                    ],
                    responses: {
                        200: {
                            description: 'Список с пагинацией',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            data: { type: 'array', items: { $ref: '#/components/schemas/Activity' } },
                                            total: { type: 'integer' },
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Activities'],
                    summary: 'Создать активность',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivityInput' } } },
                    },
                    responses: {
                        201: { description: 'Создана', content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
                        400: { description: 'Ошибка валидации' },
                    },
                },
            },
            '/activities/{id}': {
                get: {
                    tags: ['Activities'],
                    summary: 'Получить активность по ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Активность', content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
                        404: { description: 'Не найдена' },
                    },
                },
                put: {
                    tags: ['Activities'],
                    summary: 'Обновить активность',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivityInput' } } },
                    },
                    responses: {
                        200: { description: 'Обновлена' },
                        404: { description: 'Не найдена' },
                    },
                },
                delete: {
                    tags: ['Activities'],
                    summary: 'Удалить активность',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Удалена' },
                        404: { description: 'Не найдена' },
                    },
                },
            },

            // ============ Dashboard ============
            '/dashboard/summary': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Сводка дашборда',
                    description: 'Возвращает: итоги, сегодня, цели, прогресс, неделя, график за 7 дней, статистика по типам, рекорды, достижения',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Сводка', content: { 'application/json': { schema: { $ref: '#/components/schemas/Summary' } } } } },
                },
            },
            '/dashboard/series': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Данные графика за период',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'range', in: 'query', schema: { type: 'string', enum: ['7d', '30d', '3m', '1y'], default: '7d' } },
                    ],
                    responses: { 200: { description: 'Массив точек (date, steps, calories, minutes)' } },
                },
            },
            '/dashboard/leaderboard': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Рейтинг пользователей (кэшируется Redis 60 сек)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'period', in: 'query', schema: { type: 'string', enum: ['week', 'month', 'all'], default: 'week' } },
                    ],
                    responses: {
                        200: {
                            description: 'Топ-20',
                            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/LeaderboardRow' } } } } } },
                        },
                    },
                },
            },
            '/dashboard/goals': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Текущие цели',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Цели', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Goals' } } } } } } },
                },
                put: {
                    tags: ['Dashboard'],
                    summary: 'Обновить цели',
                    security: [{ bearerAuth: [] }],
                    requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Goals' } } } },
                    responses: { 200: { description: 'Обновлённые цели' }, 400: { description: 'Валидация' } },
                },
            },
            '/dashboard/profile': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Физический профиль + история веса',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Профиль и weightHistory' } },
                },
                put: {
                    tags: ['Dashboard'],
                    summary: 'Обновить физический профиль',
                    security: [{ bearerAuth: [] }],
                    requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } } },
                    responses: { 200: { description: 'Обновлён' }, 400: { description: 'Валидация' } },
                },
            },
            '/dashboard/weight': {
                post: {
                    tags: ['Dashboard'],
                    summary: 'Записать вес',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['weight'],
                                    properties: {
                                        weight: { type: 'number', minimum: 20, maximum: 400, example: 75 },
                                        date: { type: 'string', format: 'date' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 201: { description: 'Запись создана' }, 400: { description: 'Валидация' } },
                },
            },
            '/dashboard/export': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Экспорт активностей в CSV',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv'], default: 'csv' } },
                    ],
                    responses: {
                        200: { description: 'CSV-файл', content: { 'text/csv': { schema: { type: 'string' } } } },
                    },
                },
            },

            // ============ MongoDB collections ============
            '/mongo/stats': {
                get: {
                    tags: ['MongoDB'],
                    summary: 'UserProfile — список',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Профили пользователя' } },
                },
                post: {
                    tags: ['MongoDB'],
                    summary: 'UserProfile — создать',
                    security: [{ bearerAuth: [] }],
                    responses: { 201: { description: 'Создан' }, 400: { description: 'Валидация / дубликат' } },
                },
            },
            '/mongo/achievements': {
                get: {
                    tags: ['MongoDB'],
                    summary: 'Достижения',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
                    responses: { 200: { description: 'Список достижений' } },
                },
                post: {
                    tags: ['MongoDB'],
                    summary: 'Создать достижение',
                    security: [{ bearerAuth: [] }],
                    responses: { 201: { description: 'Создано' } },
                },
            },
            '/mongo/daily-stats': {
                get: {
                    tags: ['MongoDB'],
                    summary: 'Статистика по дням',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
                    ],
                    responses: { 200: { description: 'Дневная статистика (до 90 дней)' } },
                },
            },
            '/mongo/weight-history': {
                get: {
                    tags: ['MongoDB'],
                    summary: 'История веса',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
                    ],
                    responses: { 200: { description: 'Записи веса (до 90)' } },
                },
                post: {
                    tags: ['MongoDB'],
                    summary: 'Добавить запись веса',
                    security: [{ bearerAuth: [] }],
                    responses: { 201: { description: 'Создана' } },
                },
            },
        },
    },
    apis: [],
};

const spec = swaggerJsdoc(options);

function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
        customSiteTitle: 'Fitness Tracker API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
    }));
    app.get('/api-docs.json', (req, res) => res.json(spec));
}

module.exports = setupSwagger;
