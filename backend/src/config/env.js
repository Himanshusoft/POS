import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'POS',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  RAZORPAY_CURRENCY: process.env.RAZORPAY_CURRENCY || 'INR',
  REDIS_URL: process.env.REDIS_URL || '',
  SLOW_REQUEST_THRESHOLD_MS: parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '500', 10),
  SLOW_QUERY_THRESHOLD_MS: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '200', 10),
  ENABLE_PROFILING: process.env.ENABLE_PROFILING === 'true',
  PERF_LOGS_ENABLED: process.env.PERF_LOGS_ENABLED === 'true',
};

// Singleton PrismaClient setup with opt-in slow-query profiling
const globalForPrisma = globalThis;
const createPrismaClient = () => {
  const baseClient = new PrismaClient();
  const shouldProfile = env.PERF_LOGS_ENABLED || env.ENABLE_PROFILING;

  if (!shouldProfile) {
    return baseClient;
  }

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const duration = Math.round(performance.now() - start);
          if (duration >= (env.SLOW_QUERY_THRESHOLD_MS || 200)) {
            console.warn(
              `[SLOW QUERY] ${model}.${operation} took ${duration}ms (threshold=${env.SLOW_QUERY_THRESHOLD_MS || 200}ms)`
            );
          }
          return result;
        },
      },
    },
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default env;
