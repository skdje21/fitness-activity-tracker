# ---- Frontend: React (Vite) — многоэтапная сборка ----

# Этап 1: сборка статики
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Адрес бэкенда «вшивается» в сборку Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Этап 2: лёгкий nginx раздаёт готовый dist (без Node и node_modules)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
