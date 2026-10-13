import { sendError } from '../utils/response.js';
import { getPagination } from '../utils/pagination.js';

export const validateRequest = (validatorFn) => {
  return (req, res, next) => {
    if (typeof validatorFn !== 'function') {
      return next();
    }

    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return sendError(res, 400, 'Validation failed: request body is missing or empty. Please ensure you send a valid JSON body with Content-Type: application/json header.', [
        'Request body cannot be empty',
      ]);
    }

    const validationResult = validatorFn(req.body);
    if (!validationResult.isValid) {
      return sendError(res, 400, 'Validation failed', {
        validationErrors: validationResult.errors,
      });
    }

    next();
  };
};

export const validateQuery = (req, res, next) => {
  try {
    getPagination(req.query);
    for (const field of ['startDate', 'endDate']) {
      if (req.query[field] !== undefined && (Number.isNaN(Date.parse(req.query[field])) || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(req.query[field]))) {
        return sendError(res, 400, 'Invalid date filter', [`${field} must be a valid ISO date`]);
      }
    }
    if (req.query.startDate && req.query.endDate && Date.parse(req.query.startDate) > Date.parse(req.query.endDate)) {
      return sendError(res, 400, 'Invalid date range', ['startDate must be on or before endDate']);
    }
    if (req.query.status) {
      const s = String(req.query.status).trim().toUpperCase();
      if (s === 'ALL') {
        delete req.query.status;
      } else if (s === 'COOKING') {
        req.query.status = 'IN_PREPARATION';
      } else {
        req.query.status = s;
      }
    }
    if (req.query.status && !['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE', 'PENDING', 'ACCEPTED', 'IN_PREPARATION', 'COOKING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'UNPAID', 'PAID', 'PARTIALLY_PAID', 'VOID', 'ORDERED', 'RECEIVED'].includes(req.query.status)) {
      return sendError(res, 400, 'Invalid status filter', ['status is not supported']);
    }
    if (req.query.unit && !['KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'PACKET', 'CAN', 'BOTTLE'].includes(req.query.unit)) {
      return sendError(res, 400, 'Invalid unit filter', ['unit is not supported']);
    }
    if (req.query.isAvailable !== undefined && !['true', 'false'].includes(req.query.isAvailable)) {
      return sendError(res, 400, 'Invalid availability filter', ['isAvailable must be true or false']);
    }
    if (req.query.search !== undefined && (typeof req.query.search !== 'string' || req.query.search.length > 100)) {
      return sendError(res, 400, 'Invalid search filter', ['search must be at most 100 characters']);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default validateRequest;
