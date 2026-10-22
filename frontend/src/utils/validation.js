/**
 * Centralized Validation Utilities for ApexPOS
 * Supports country-aware international phone numbering plans,
 * numeric ranges, and eliminates non-numeric/scientific notation inputs.
 */

import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  getCountryByDialCode,
  guessCountryFromCurrency,
  sanitizePhoneDigits,
  parsePhoneNumber,
  validatePhoneNumber,
  normalizePhoneNumber,
} from './countryPhoneData.js';

export {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  getCountryByDialCode,
  guessCountryFromCurrency,
  sanitizePhoneDigits,
  parsePhoneNumber,
  validatePhoneNumber,
  normalizePhoneNumber,
};

/**
 * Indian Mobile Number Regex:
 * - Optional +91 prefix, followed by optional space or hyphen
 * - Exactly 10 digits starting with 6, 7, 8, or 9
 * Examples: 9876543210, +919876543210, +91 9876543210, +91-9876543210
 */
export const INDIAN_PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

/**
 * Validates whether the given string is a valid Indian mobile number.
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidIndianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return INDIAN_PHONE_REGEX.test(phone.trim());
};

/**
 * Strips disallowed characters from phone input during keyboard/paste events.
 * Only allows digits, '+', '-', and single spaces.
 * @param {string} val
 * @returns {string}
 */
export const sanitizePhoneInput = (val) => {
  if (!val) return '';
  return String(val).replace(/[^\d+\-\s]/g, '');
};

/**
 * Country-aware phone validation.
 * Supports:
 * - validatePhoneInput(val, required = false, countryCode = 'IN')
 * - validatePhoneInput(val, { required: true, countryCode: 'US' })
 * - validatePhoneInput(val, required = false) -> Auto-detects country if prefixed with '+', otherwise uses 'IN'
 *
 * @param {string} val
 * @param {boolean|Object} requiredOrOptions
 * @param {string} [explicitCountryCode]
 * @returns {string} Error message or empty string if valid
 */
export const validatePhoneInput = (val, requiredOrOptions = false, explicitCountryCode) => {
  let required = false;
  let countryCode = explicitCountryCode;

  if (typeof requiredOrOptions === 'object' && requiredOrOptions !== null) {
    required = Boolean(requiredOrOptions.required);
    if (requiredOrOptions.countryCode) {
      countryCode = requiredOrOptions.countryCode;
    }
  } else {
    required = Boolean(requiredOrOptions);
  }

  if (!val || !String(val).trim()) {
    return required ? 'Phone number is required' : '';
  }

  const trimmed = String(val).trim();
  if (/[a-zA-Z]/.test(trimmed)) {
    return 'Phone number cannot contain alphabetic characters';
  }

  // Parse phone number to identify country and national digits
  const parsed = parsePhoneNumber(trimmed, countryCode || DEFAULT_COUNTRY);
  const effectiveCountry = countryCode || parsed.countryCode || DEFAULT_COUNTRY;

  const result = validatePhoneNumber(parsed.nationalNumber, effectiveCountry, { required });
  return result.isValid ? '' : result.error;
};

/**
 * Detects scientific notation in numeric input strings (e.g. 1e5, 2E3).
 * @param {any} val
 * @returns {boolean}
 */
export const isScientificNotation = (val) => {
  return typeof val === 'string' && /[eE]/.test(val);
};

/**
 * Validates a numeric value within constraints.
 * @param {any} val
 * @param {Object} options
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @param {boolean} [options.integer=false]
 * @param {boolean} [options.required=true]
 * @param {string} [options.fieldName='Value']
 * @returns {string} Error message or empty string
 */
export const validateNumericField = (val, { min = 0, max = Infinity, integer = false, required = true, fieldName = 'Value' } = {}) => {
  if (val === '' || val === null || val === undefined) {
    return required ? `${fieldName} is required` : '';
  }
  const str = String(val).trim();
  if (isScientificNotation(str)) {
    return `${fieldName} cannot use scientific notation`;
  }
  const num = Number(str);
  if (!Number.isFinite(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (integer && !Number.isInteger(num)) {
    return `${fieldName} must be a whole integer`;
  }
  if (num < min) {
    return `${fieldName} cannot be less than ${min}`;
  }
  if (num > max) {
    return `${fieldName} cannot exceed ${max}`;
  }
  return '';
};

export default {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  getCountryByDialCode,
  guessCountryFromCurrency,
  sanitizePhoneDigits,
  parsePhoneNumber,
  validatePhoneNumber,
  normalizePhoneNumber,
  INDIAN_PHONE_REGEX,
  isValidIndianPhone,
  sanitizePhoneInput,
  validatePhoneInput,
  isScientificNotation,
  validateNumericField,
};
