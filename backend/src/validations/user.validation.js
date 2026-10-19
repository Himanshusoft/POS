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
    const raw = String(data.phone).trim();
    const cleaned = raw.startsWith('+91') ? raw.slice(3).trim() : raw;
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length !== 10) {
      errors.push('Enter a valid 10-digit mobile number');
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
    const raw = String(data.phone).trim();
    const cleaned = raw.startsWith('+91') ? raw.slice(3).trim() : raw;
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length !== 10) {
      errors.push('Enter a valid 10-digit mobile number');
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
