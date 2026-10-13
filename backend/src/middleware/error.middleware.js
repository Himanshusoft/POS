import { sendError } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);

  if (statusCode >= 500) {
    console.error('[Centralized Error Handler]:', err);
  }

  // Body JSON syntax error (e.g., malformed JSON payload)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Malformed JSON in request body', ['The request body contains invalid JSON syntax.']);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const targets = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || 'field');
    return sendError(res, 409, `A record with this ${targets} already exists.`, [`Duplicate value for: ${targets}`]);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return sendError(res, 404, 'Requested record was not found');
  }

  // Prisma foreign key constraint violation
  if (err.code === 'P2003') {
    return sendError(res, 400, 'A referenced record does not exist');
  }

  if (err.code === 'P2034') {
    return sendError(res, 409, 'The record changed during this request. Please retry.');
  }

  if (err.code === 'P2000' || err.code === 'P2006' || err.code === 'P2011') {
    return sendError(res, 400, 'Request contains invalid or out-of-range data');
  }

  // Prisma connection/initialization error
  if (err.name === 'PrismaClientInitializationError' || err.code === 'P1001' || err.code === 'P1000') {
    return sendError(res, 503, 'Database connection failed. Please ensure the database is accessible.', [
      err.message || 'Unable to connect to the database server'
    ]);
  }

  const message = statusCode >= 500
    ? (process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error')
    : (err.message || 'Request failed');

  const errors = (statusCode === 422 || statusCode === 400)
    ? (err.errors || [])
    : (statusCode >= 500 && process.env.NODE_ENV !== 'production' ? [err.message] : []);

  const extra = {};
  if (err.code) extra.code = err.code;
  if (err.items !== undefined) extra.items = err.items;

  return sendError(res, statusCode, message, errors, extra);
};

export default errorHandler;
