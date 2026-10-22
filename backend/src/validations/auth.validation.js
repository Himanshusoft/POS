import { validatePhoneField } from '../utils/countryPhoneData.js';

export const validateRegisterOwner = (data) => {
  const errors = [];
  const restaurantName = data?.restaurantName || data?.restaurant_name;
  if (!restaurantName || typeof restaurantName !== 'string' || !restaurantName.trim()) {
    errors.push('restaurantName (or restaurant_name) is required');
  }
  if (!data?.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('name is required');
  }
  if (!data?.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('A valid email address is required');
  }
  if (!data?.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (data?.name?.length > 120 || (restaurantName && restaurantName.length > 150)) {
    errors.push('Name fields exceed the allowed length');
  }
  if (data?.email?.length > 254) errors.push('email must be at most 254 characters');
  if (data?.phone !== undefined && data?.phone !== null && data?.phone !== '') {
    const phoneCheck = validatePhoneField(data.phone, data.countryCode || data.phoneCountry || data.country);
    if (!phoneCheck.isValid) {
      errors.push(phoneCheck.error);
    }
  }
  return { isValid: errors.length === 0, errors };
};

export const validateLogin = (data) => {
  const errors = [];
  if (!data?.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('A valid email address is required');
  }
  if (!data?.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  }
  if (typeof data?.password === 'string' && data.password.length > 200) errors.push('Password is too long');
  return { isValid: errors.length === 0, errors };
};

export const validateForgotPassword = (data) => {
  const errors = [];
  if (!data?.email || typeof data.email !== 'string' || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('A valid email address is required');
  }
  if (data?.email && data.email.length > 254) {
    errors.push('Email must be at most 254 characters');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateVerifyResetOtp = (data) => {
  const errors = [];
  if (!data?.email || typeof data.email !== 'string' || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('A valid email address is required');
  }
  const otp = data?.otp !== undefined ? String(data.otp).trim() : '';
  if (!otp || !/^\d{6}$/.test(otp)) {
    errors.push('A 6-digit verification code is required');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateResendResetOtp = (data) => {
  const errors = [];
  if (!data?.email || typeof data.email !== 'string' || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('A valid email address is required');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateResetPassword = (data) => {
  const errors = [];
  if (!data?.resetToken || typeof data.resetToken !== 'string' || !data.resetToken.trim()) {
    errors.push('Reset authorization token is required');
  }
  const pwd = data?.newPassword;
  if (!pwd || typeof pwd !== 'string') {
    errors.push('New password is required');
  } else {
    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Password must contain at least one number');
    }
    if (pwd.length > 200) {
      errors.push('Password is too long');
    }
  }
  return { isValid: errors.length === 0, errors };
};

export default {
  validateRegisterOwner,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetOtp,
  validateResendResetOtp,
  validateResetPassword,
};
