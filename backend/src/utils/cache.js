import { redisClient, isRedisAvailable, memoryFallback } from '../config/redis.js';

/**
 * Builds a deterministic, tenant-isolated cache key.
 * Format: pos:<tenantId>:<resource>:<hashOrSerializedParams>
 */
export const buildCacheKey = (restaurantId, resource, params = {}) => {
  const tenant = restaurantId || 'global';
  const cleanParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        acc[key] = params[key];
      }
      return acc;
    }, {});
  const queryStr = Object.keys(cleanParams).length > 0 ? JSON.stringify(cleanParams) : 'default';
  return `pos:${tenant}:${resource}:${queryStr}`;
};

/**
 * Executes a cache-aside query with transparent fallback and fail-safety.
 * If Redis is connected, uses Redis with the provided TTL.
 * If Redis is absent or encounters errors, transparently falls back to bounded memory cache.
 * If cache misses or fails, executes fetcherFn() without interrupting the user workflow.
 */
export const cachedQuery = async (cacheKey, ttlSeconds, fetcherFn) => {
  // 1. Try reading from Redis if connected
  if (redisClient && isRedisAvailable) {
    try {
      const raw = await redisClient.get(cacheKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      // Redis error, safely proceed to memory fallback
    }
  }

  // Check in-memory fallback
  const memVal = memoryFallback.get(cacheKey);
  if (memVal !== null && memVal !== undefined) {
    try {
      return JSON.parse(JSON.stringify(memVal));
    } catch {
      return memVal;
    }
  }

  // 2. Cache miss: execute authoritative fetcher
  const result = await fetcherFn();

  // 3. Store result in cache
  if (result !== undefined && result !== null) {
    if (redisClient && isRedisAvailable) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds);
      } catch (err) {
        try {
          memoryFallback.set(cacheKey, JSON.parse(JSON.stringify(result)), ttlSeconds);
        } catch {
          memoryFallback.set(cacheKey, result, ttlSeconds);
        }
      }
    } else {
      try {
        memoryFallback.set(cacheKey, JSON.parse(JSON.stringify(result)), ttlSeconds);
      } catch {
        memoryFallback.set(cacheKey, result, ttlSeconds);
      }
    }
  }

  return result;
};

/**
 * Safely invalidates cache keys matching a pattern.
 * Uses cursor-based SCAN on Redis (never blocking KEYS *) and regex on memory fallback.
 */
export const invalidatePattern = async (pattern) => {
  // Invalidate memory fallback
  memoryFallback.delPattern(pattern);

  // Invalidate Redis using non-blocking SCAN
  if (redisClient && isRedisAvailable) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      // Safe fallback: error logged elsewhere, do not break flow
    }
  }
};

// ==========================================
// PRECISE DOMAIN CACHE INVALIDATION HELPERS
// ==========================================

export const invalidateTableCache = async (restaurantId) => {
  if (!restaurantId) return;
  await Promise.all([
    invalidatePattern(`pos:${restaurantId}:tables:*`),
    invalidatePattern(`pos:${restaurantId}:waiter:*`),
    invalidatePattern(`pos:${restaurantId}:reports:*`),
  ]);
};

export const invalidateMenuCache = async (restaurantId) => {
  if (!restaurantId) return;
  await Promise.all([
    invalidatePattern(`pos:${restaurantId}:menu:*`),
    invalidatePattern(`pos:${restaurantId}:recipes:*`),
    invalidatePattern(`pos:${restaurantId}:reports:*`),
  ]);
};

export const invalidateRecipeCache = async (restaurantId) => {
  if (!restaurantId) return;
  await Promise.all([
    invalidatePattern(`pos:${restaurantId}:recipes:*`),
    invalidatePattern(`pos:${restaurantId}:menu:*`),
  ]);
};

export const invalidateOrderCache = async (restaurantId) => {
  if (!restaurantId) return;
  await Promise.all([
    invalidatePattern(`pos:${restaurantId}:orders:*`),
    invalidatePattern(`pos:${restaurantId}:waiter:*`),
    invalidatePattern(`pos:${restaurantId}:kitchen:*`),
    invalidatePattern(`pos:${restaurantId}:tables:*`),
    invalidatePattern(`pos:${restaurantId}:billing:*`),
    invalidatePattern(`pos:${restaurantId}:reports:*`),
  ]);
};

export const invalidateBillingCache = async (restaurantId) => {
  if (!restaurantId) return;
  await Promise.all([
    invalidatePattern(`pos:${restaurantId}:billing:*`),
    invalidatePattern(`pos:${restaurantId}:payments:*`),
    invalidatePattern(`pos:${restaurantId}:waiter:*`),
    invalidatePattern(`pos:${restaurantId}:tables:*`),
    invalidatePattern(`pos:${restaurantId}:reports:*`),
  ]);
};

export const invalidateInventoryCache = async (restaurantId) => {
  if (!restaurantId) return;
  await Promise.all([
    invalidatePattern(`pos:${restaurantId}:inventory:*`),
    invalidatePattern(`pos:${restaurantId}:kitchen:*`),
    invalidatePattern(`pos:${restaurantId}:reports:*`),
  ]);
};

export const invalidateUserAuthCache = async (userId) => {
  if (userId) {
    await invalidatePattern(`pos:auth:user:${userId}`);
  } else {
    await invalidatePattern('pos:auth:user:*');
  }
};

export const invalidateUserCache = async (restaurantId, userId = null) => {
  const promises = [];
  if (restaurantId) {
    promises.push(invalidatePattern(`pos:${restaurantId}:users:*`));
    promises.push(invalidatePattern(`pos:${restaurantId}:reports:*`));
  }
  if (userId) {
    promises.push(invalidatePattern(`pos:auth:user:${userId}`));
  } else {
    promises.push(invalidatePattern('pos:auth:user:*'));
  }
  await Promise.all(promises);
};

export const invalidateSettingsCache = async (restaurantId) => {
  await invalidatePattern(`pos:${restaurantId || 'global'}:settings:*`);
};

export const invalidateReportsCache = async (restaurantId) => {
  if (!restaurantId) return;
  await invalidatePattern(`pos:${restaurantId}:reports:*`);
};

export const invalidateSuperAdminCache = async () => {
  await invalidatePattern('pos:global:superadmin:*');
};

/**
 * Revokes a JWT token by storing it in Redis / in-memory cache until expiration.
 */
export const revokeToken = async (token, expiresInSeconds = 86400) => {
  if (!token) return;
  const key = `pos:auth:revoked:${token}`;
  if (redisClient && isRedisAvailable) {
    try {
      await redisClient.set(key, '1', 'EX', expiresInSeconds);
      return;
    } catch {
      // Fallback to memory cache
    }
  }
  memoryFallback.set(key, '1', expiresInSeconds);
};

/**
 * Checks if a JWT token has been explicitly revoked via logout.
 */
export const isTokenRevoked = async (token) => {
  if (!token) return false;
  const key = `pos:auth:revoked:${token}`;
  if (redisClient && isRedisAvailable) {
    try {
      const val = await redisClient.get(key);
      if (val) return true;
    } catch {
      // Fallback to memory cache
    }
  }
  return Boolean(memoryFallback.get(key));
};
