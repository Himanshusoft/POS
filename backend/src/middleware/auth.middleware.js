import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../config/env.js';
import { cachedQuery, isTokenRevoked } from '../utils/cache.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Authentication token missing or invalid', {
        code: 'UNAUTHORIZED',
        details: 'Authorization header must follow Bearer <token> format',
      });
    }   

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Authentication token has expired', { code: 'TOKEN_EXPIRED' });
      }
      return sendError(res, 401, 'Invalid authentication token', { code: 'INVALID_TOKEN' });
    }

    const isRevoked = await isTokenRevoked(token);
    if (isRevoked) {
      return sendError(res, 401, 'Authentication token has been revoked / logged out', { code: 'TOKEN_REVOKED' });
    }

    const userId = decoded.userId || decoded.id;
    const user = await cachedQuery(`pos:auth:user:${userId}`, 30, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              isActive: true,
              currency: true,
              taxRate: true,
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });
    });

    if (!user) {
      return sendError(res, 401, 'User account no longer exists', { code: 'USER_NOT_FOUND' });
    }

    if (!user.isActive) {
      return sendError(res, 401, 'User account has been deactivated', { code: 'ACCOUNT_DEACTIVATED' });
    }

    // Tenant isolation verification: if token has explicit organization/restaurant context, verify match
    const tokenOrgId = decoded.organizationId || decoded.restaurantId;
    if (tokenOrgId && user.restaurantId && tokenOrgId !== user.restaurantId) {
      return sendError(res, 401, 'Token organization context mismatch', { code: 'ORGANIZATION_MISMATCH' });
    }

    if (user.role !== 'RESTAURANT_REGISTRATION_ADMIN') {
      if (!user.restaurantId || !user.restaurant) {
        return sendError(res, 403, 'User account is not linked to an active restaurant organisation.', {
          code: 'RESTAURANT_NOT_FOUND',
        });
      }
    }

    if (user.restaurant && user.role !== 'RESTAURANT_REGISTRATION_ADMIN') {
      if (user.restaurant.isActive === false) {
        return sendError(res, 403, 'Restaurant account has been deactivated. Please contact system administration.', {
          code: 'RESTAURANT_DEACTIVATED',
        });
      }

      if (user.restaurant.subscription && user.restaurant.subscription.status === 'SUSPENDED') {
        return sendError(res, 403, 'Restaurant subscription has been suspended. Please contact platform administration.', {
          code: 'SUBSCRIPTION_SUSPENDED',
        });
      }

      if (user.restaurant.subscription && user.restaurant.subscription.status === 'EXPIRED') {
        return sendError(res, 403, 'Restaurant subscription has expired. Please renew your plan.', {
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
    }

    const orgId = user.restaurantId;
    user.organizationId = orgId;
    req.user = user;
    req.organizationId = orgId;
    req.restaurantId = orgId;
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
