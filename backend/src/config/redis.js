import Redis from 'ioredis';
import { env } from './env.js';

let redisClient = null;
let isRedisAvailable = false;
let hasLoggedRedisError = false;

// Simple in-memory LRU-like TTL cache fallback when Redis is absent/down
class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 60) {
    // Keep memory bounded to 2000 entries
    if (this.store.size > 2000) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp('^' + escaped + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

export const memoryFallback = new MemoryCacheFallback();

const redisUrl = process.env.REDIS_URL || env.REDIS_URL;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          if (!hasLoggedRedisError) {
            console.warn('[Cache] Redis unavailable. Gracefully operating with in-memory cache fallback.');
            hasLoggedRedisError = true;
          }
          return null; // Stop retrying continuously
        }
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      hasLoggedRedisError = false;
      console.log('[Cache] Redis client connected successfully.');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      if (!hasLoggedRedisError) {
        console.warn(`[Cache] Redis notice: ${err.code || err.message}. Fallback cache active.`);
        hasLoggedRedisError = true;
      }
    });
  } catch (err) {
    isRedisAvailable = false;
    redisClient = null;
  }
} else {
  // Safe default: no REDIS_URL provided, using memory fallback seamlessly
  isRedisAvailable = false;
}

export { redisClient, isRedisAvailable };
export default redisClient;
