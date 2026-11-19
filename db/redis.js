const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let client = null;
let available = false;

function getClient() {
    if (client) return client;

    client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
    });

    client.on('connect', () => {
        available = true;
        console.log('Redis connected');
    });
    client.on('error', () => {
        available = false;
    });
    client.on('close', () => {
        available = false;
    });

    return client;
}

async function connectRedis() {
    const c = getClient();
    try {
        await c.connect();
        available = true;
    } catch {
        console.warn('Redis недоступен — кэширование отключено');
        available = false;
    }
}

async function cacheGet(key) {
    if (!available) return null;
    try {
        const val = await getClient().get(key);
        return val ? JSON.parse(val) : null;
    } catch {
        return null;
    }
}

async function cacheSet(key, data, ttlSeconds = 60) {
    if (!available) return;
    try {
        await getClient().set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch { /* ignore */ }
}

async function cacheDel(pattern) {
    if (!available) return;
    try {
        const keys = await getClient().keys(pattern);
        if (keys.length) await getClient().del(...keys);
    } catch { /* ignore */ }
}

async function blacklistToken(token, ttlSeconds) {
    if (!available) return;
    try {
        await getClient().set(`bl:${token}`, '1', 'EX', ttlSeconds);
    } catch { /* ignore */ }
}

async function isTokenBlacklisted(token) {
    if (!available) return false;
    try {
        return await getClient().exists(`bl:${token}`) === 1;
    } catch {
        return false;
    }
}

module.exports = { connectRedis, cacheGet, cacheSet, cacheDel, blacklistToken, isTokenBlacklisted };
