import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis.js';

export const limitByIP = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rate-limit:login:',
    }),
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        "success": false,
        "message": "Too many login attempts, try again later"
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.ip === '::1' || req.ip === '127.0.0.1';
    }
})