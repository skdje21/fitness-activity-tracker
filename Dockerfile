# ---- Backend: Node.js + Express ----
FROM node:20-alpine
WORKDIR /app

# Инструменты для сборки нативного модуля bcrypt (в alpine их нет по умолчанию)
RUN apk add --no-cache python3 make g++

# Сначала зависимости (кэш слоя не сбрасывается при изменении кода)
COPY package*.json ./
RUN npm ci

# Затем исходный код
COPY . .

EXPOSE 3000

# При старте: применяем миграции Sequelize, затем запускаем сервер
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node server.js"]
