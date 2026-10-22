import { validatePhoneField } from '../utils/countryPhoneData.js';

const INDIAN_PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

export const validateCreateStaff = (data) => {
  const errors = [];
  const validRoles = ['KITCHEN_ADMIN', 'WAITER', 'RECEPTIONIST'];
  if (!data?.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('name is required');
  }
  if (!data?.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('A valid email address is required');
  }
  if (!data?.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (!data?.role || !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }
  if (data?.name?.length > 120) errors.push('name must be at most 120 characters');
  if (data?.email?.length > 254) errors.push('email must be at most 254 characters');
  if (data?.phone !== undefined && data?.phone !== null && data?.phone !== '') {
    const phoneCheck = validatePhoneField(data.phone, data.countryCode || data.phoneCountry || data.country);
    if (!phoneCheck.isValid) {
      errors.push(phoneCheck.error);
    }
  }
  return { isValid: errors.length === 0, errors };
};

export const validateUpdateStaff = (data) => {
  const errors = [];
  const validRoles = ['KITCHEN_ADMIN', 'WAITER', 'RECEPTIONIST'];
  if (data?.role && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }
  if (data?.password && data.password.length < 6) {
    errors.push('Password must be at least 6 characters long if provided');
  }
  if (data?.name !== undefined && (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120)) errors.push('name must be a non-empty string of at most 120 characters');
  if (!Object.keys(data || {}).some((key) => ['name', 'role', 'phone', 'isActive', 'password'].includes(key))) errors.push('At least one supported field is required');
  if (data?.phone !== undefined && data?.phone !== null && data?.phone !== '') {
    const phoneCheck = validatePhoneField(data.phone, data.countryCode || data.phoneCountry || data.country);
    if (!phoneCheck.isValid) {
      errors.push(phoneCheck.error);
    }
  }
  return { isValid: errors.length === 0, errors };
};

export const validateStatusUpdate = (data) => {
  const errors = [];
  if (typeof data?.isActive !== 'boolean') {
    errors.push('isActive must be a boolean (true or false)');
  }
  return { isValid: errors.length === 0, errors };
};

export default {
  validateCreateStaff,
  validateUpdateStaff,
  validateStatusUpdate,
};
