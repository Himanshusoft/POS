import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const getJwtSecret = () => {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) {
    return env.JWT_SECRET;
  }
  if (env.NODE_ENV !== 'production') {
    return 'dev_default_fallback_jwt_secret_key_at_least_32_chars_long!';
  }
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production');
};

export const signToken = (payload, expiresIn = '1d') => {
  const orgId = payload.organizationId || payload.restaurantId;
  const normalizedPayload = {
    ...payload,
    ...(orgId ? { restaurantId: orgId, organizationId: orgId } : {}),
  };
  return jwt.sign(normalizedPayload, getJwtSecret(), { expiresIn });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

export const decodeToken = (token) => {
  if (!token) return null;
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

export default {
  signToken,
  verifyToken,
  decodeToken,
};
